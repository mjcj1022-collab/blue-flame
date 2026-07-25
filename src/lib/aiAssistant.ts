import { ALLOYS, SHAPES, STONES, SETTINGS, FINISHES } from '../catalog'
import { NO_STONE, type ProductCategory, type FinishId } from '../spec/types'
import { api } from './api'
import { useDesign } from '../state/design'

/**
 * The client half of the AI design assistant. The model is asked to reply in
 * strict JSON — a friendly message plus an optional `design` patch of real
 * catalog ids — which we validate here (a hallucinated id is simply dropped) and
 * apply to the live design. The server holds the key; this only shapes the
 * prompt, parses the reply, and drives the store. Photo/sketch → design is the
 * same path with an image attached.
 */

const CATEGORIES: ProductCategory[] = ['ring', 'pendant', 'earring', 'bracelet', 'necklace']

export interface AiDesignPatch {
  category?: ProductCategory
  alloyId?: string
  shapeId?: string
  stoneTypeId?: string
  carat?: number
  settingId?: string
  size?: number
  finish?: FinishId
}
export interface AiReply { reply: string; design: AiDesignPatch | null; matched: string[] }
export interface ChatTurn { role: 'user' | 'assistant'; content: string }

const list = (rows: { id: string; name: string }[]) => rows.map(r => `${r.id} (${r.name})`).join(', ')

/** The system prompt — teaches the model the exact catalog ids it may use and
 *  the strict JSON envelope we parse. Built from the live catalog. */
export function buildSystemPrompt(): string {
  return [
    'You are the design assistant for Blue Flame, a fine-jewelry CAD app.',
    'Help the user design a piece. When they describe (or show a photo/sketch of) a piece, translate it into the app\'s parametric design.',
    'ALWAYS reply with a single JSON object and nothing else, in this exact shape:',
    '{ "reply": "<one or two friendly sentences>", "design": { ...fields... } | null }',
    'Include only the design fields you are changing. Use ONLY these ids:',
    `category: ${CATEGORIES.join(', ')}`,
    `alloyId: ${list(ALLOYS)}`,
    `shapeId (stone cut): ${list(SHAPES)}`,
    `stoneTypeId: ${list(STONES)}, or "${NO_STONE}" for no center stone`,
    `settingId: ${list(SETTINGS)}`,
    `finish: ${list(FINISHES)}`,
    'carat: number 0.05–20. size: US ring size 2–16.',
    'If the request is a question or chit-chat, set "design" to null and just answer in "reply".'
  ].join('\n')
}

/** Pull the JSON envelope out of a model reply that may be fenced or chatty. */
export function parseAiReply(text: string): AiReply {
  const raw = extractJson(text)
  if (!raw) return { reply: text.trim() || 'Done.', design: null, matched: [] }
  let obj: { reply?: unknown; design?: unknown }
  try { obj = JSON.parse(raw) } catch { return { reply: text.trim(), design: null, matched: [] } }
  const design = normalizeAiDesign(obj.design)
  return {
    reply: typeof obj.reply === 'string' && obj.reply.trim() ? obj.reply.trim() : (design ? 'Updated the design.' : 'Done.'),
    design,
    matched: describe(design)
  }
}

function extractJson(text: string): string | null {
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const src = fence ? fence[1] : text
  const start = src.indexOf('{')
  if (start < 0) return null
  // Balance braces, but ignore any that live inside a string literal (a reply
  // like "use a } shape" must not close the object early). Tracks escapes too.
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1) }
  }
  return null
}

const ALLOY_IDS = new Set(ALLOYS.map(a => a.id))
const SHAPE_IDS = new Set(SHAPES.map(s => s.id))
const STONE_IDS = new Set<string>([...STONES.map(s => s.id), NO_STONE])
const SETTING_IDS = new Set(SETTINGS.map(s => s.id))
const FINISH_IDS = new Set<string>(FINISHES.map(f => f.id))
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Keep only fields that reference real catalog ids / sane numbers. */
export function normalizeAiDesign(raw: unknown): AiDesignPatch | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const out: AiDesignPatch = {}
  if (typeof r.category === 'string' && (CATEGORIES as string[]).includes(r.category)) out.category = r.category as ProductCategory
  if (typeof r.alloyId === 'string' && ALLOY_IDS.has(r.alloyId)) out.alloyId = r.alloyId
  if (typeof r.shapeId === 'string' && SHAPE_IDS.has(r.shapeId)) out.shapeId = r.shapeId
  if (typeof r.stoneTypeId === 'string' && STONE_IDS.has(r.stoneTypeId)) out.stoneTypeId = r.stoneTypeId
  if (typeof r.settingId === 'string' && SETTING_IDS.has(r.settingId)) out.settingId = r.settingId
  if (typeof r.finish === 'string' && FINISH_IDS.has(r.finish)) out.finish = r.finish as FinishId
  if (typeof r.carat === 'number' && Number.isFinite(r.carat)) out.carat = clamp(r.carat, 0.05, 20)
  if (typeof r.size === 'number' && Number.isFinite(r.size)) out.size = clamp(r.size, 2, 16)
  return Object.keys(out).length ? out : null
}

function describe(d: AiDesignPatch | null): string[] {
  if (!d) return []
  const m: string[] = []
  if (d.category) m.push(d.category)
  if (d.alloyId) m.push(ALLOYS.find(a => a.id === d.alloyId)?.name ?? d.alloyId)
  if (d.carat) m.push(`${d.carat.toFixed(2)} ct`)
  if (d.shapeId) m.push(SHAPES.find(s => s.id === d.shapeId)?.name ?? d.shapeId)
  if (d.stoneTypeId) m.push(d.stoneTypeId === NO_STONE ? 'no stone' : (STONES.find(s => s.id === d.stoneTypeId)?.name ?? d.stoneTypeId))
  if (d.settingId) m.push(SETTINGS.find(s => s.id === d.settingId)?.name ?? d.settingId)
  if (d.size) m.push(`size ${d.size}`)
  if (d.finish) m.push(FINISHES.find(f => f.id === d.finish)?.name ?? d.finish)
  return m
}

/** Apply a validated patch to the live design. The AI studio shows the same
 *  piece, so we don't switch tabs — the render just updates in place. */
export function applyAiDesign(d: AiDesignPatch): void {
  const s = useDesign.getState()
  if (d.category) s.setCategory(d.category)
  if (d.alloyId) s.setAlloy(d.alloyId)
  if (d.shapeId) s.setShape(d.shapeId)
  if (d.stoneTypeId) s.setStone(d.stoneTypeId)
  if (typeof d.carat === 'number') s.setCarat(d.carat)
  if (d.settingId) s.setSetting(d.settingId)
  if (typeof d.size === 'number') s.setRing({ size: d.size })
  if (d.finish) s.setFinish(d.finish)
}

/** Ask the assistant. Returns the parsed reply; throws on transport error. */
export async function askAssistant(history: ChatTurn[], image?: string | null): Promise<AiReply & { disabled?: boolean }> {
  const res = await api.assistant({ system: buildSystemPrompt(), messages: history, image: image ?? null }) as { text?: string; disabled?: boolean }
  if (res.disabled) return { reply: '', design: null, matched: [], disabled: true }
  return parseAiReply(res.text ?? '')
}

export async function assistantEnabled(): Promise<boolean> {
  try { const r = await api.assistantStatus() as { enabled?: boolean }; return !!r.enabled } catch { return false }
}
