import { useState, useEffect, useRef } from 'react'
import { askAssistant, assistantEnabled, applyAiDesign, type ChatTurn, type AiDesignPatch } from '../lib/aiAssistant'

interface Msg { role: 'user' | 'assistant'; content: string; matched?: string[]; image?: string }

const SUGGESTIONS = [
  '2 ct emerald-cut three-stone in platinum',
  'Rose-gold oval halo, size 6.5, satin finish',
  'A simple 2mm wedding band, no stone',
]

/**
 * The AI design assistant — chat that builds the piece. Describe a design (or
 * drop in a photo/sketch) and the model replies with a friendly note plus a
 * design patch that's applied to the live piece. The key lives on the server;
 * when it isn't set the panel says so instead of failing.
 */
export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => { void assistantEnabled().then(setEnabled) }, [])
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  const pickImage = (file: File) => {
    const r = new FileReader()
    r.onload = () => setImage(typeof r.result === 'string' ? r.result : null)
    r.readAsDataURL(file)
  }

  const send = async (text: string) => {
    const content = text.trim()
    if ((!content && !image) || busy) return
    const userMsg: Msg = { role: 'user', content: content || 'What can you make from this image?', image: image ?? undefined }
    const history: ChatTurn[] = [...msgs, userMsg].map(m => ({ role: m.role, content: m.content }))
    setMsgs(m => [...m, userMsg]); setInput(''); const img = image; setImage(null); setBusy(true); setErr(null)
    try {
      const res = await askAssistant(history, img)
      if (res.disabled) { setEnabled(false); return }
      const reply: Msg = { role: 'assistant', content: res.reply, matched: res.matched }
      setMsgs(m => [...m, reply])
      if (res.design) applyAiDesign(res.design as AiDesignPatch)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The assistant could not be reached.')
    } finally { setBusy(false) }
  }

  return (
    <div className="lab-overlay" onClick={onClose}>
      <div className="lab ai" style={{ width: 'min(560px,96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="lab-head">
          <div>
            <h2>AI design assistant ✦</h2>
            <p>Describe a piece or drop in a photo — it builds the design.</p>
          </div>
          <button className="lab-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {enabled === false ? (
          <div className="ai-off">
            <p><b>Not switched on yet.</b> The assistant runs on your own API key, kept on the server.</p>
            <p>Add <code>AI_API_KEY</code> to the backend environment on Render (and optionally <code>AI_PROVIDER=openai</code>), then reopen this panel. Nothing is sent anywhere until a key is set.</p>
          </div>
        ) : (
          <>
            <div className="ai-chat" ref={scroller}>
              {msgs.length === 0 && (
                <div className="ai-intro">
                  <p>Try:</p>
                  <div className="ai-sugg">
                    {SUGGESTIONS.map(s => <button key={s} className="opt" onClick={() => send(s)} disabled={busy}>{s}</button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`ai-msg ${m.role}`}>
                  {m.image && <img src={m.image} alt="upload" className="ai-thumb" />}
                  <div className="ai-bubble">
                    {m.content}
                    {m.matched && m.matched.length > 0 && (
                      <div className="ai-chips">{m.matched.map((c, j) => <span key={j} className="ai-chip">{c}</span>)}</div>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="ai-msg assistant"><div className="ai-bubble ai-typing">Designing…</div></div>}
            </div>

            {err && <div className="ai-err">{err}</div>}
            {image && <div className="ai-attach">Image attached <button onClick={() => setImage(null)} aria-label="remove image">✕</button></div>}

            <div className="ai-input">
              <label className="ai-upload" title="Attach a photo or sketch">
                📷<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = '' }} />
              </label>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(input) }}
                placeholder={enabled === null ? 'Checking…' : 'Describe a piece…'}
                disabled={busy || enabled === null}
              />
              <button className="primary" onClick={() => send(input)} disabled={busy || (!input.trim() && !image)}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
