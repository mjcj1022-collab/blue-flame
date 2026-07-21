import type { SketchDef } from '../state/modeler'

/** A reusable sketch profile — built-in or saved by the user. */
export interface SketchPreset {
  id: string
  name: string
  sketch: SketchDef
  builtin?: boolean
}

const KEY = 'blue-flame:sketch-presets'

const rev = (points: [number, number][], segments = 48, arc = 360): SketchDef =>
  ({ points, mode: 'revolve', depth: 3, segments, arc })
const ext = (points: [number, number][], depth = 3): SketchDef =>
  ({ points, mode: 'extrude', depth, segments: 48, arc: 360 })

/** A small starter library of common jewelry profiles (revolve unless noted). */
export const BUILTIN_PRESETS: SketchPreset[] = [
  { id: 'b-dome', name: 'Dome', builtin: true, sketch: rev([[0, 8], [4, 7.4], [7, 5.2], [8.4, 2.6], [8.8, 0]]) },
  { id: 'b-bowl', name: 'Bowl', builtin: true, sketch: rev([[3, 10], [9, 9], [11, 4], [9, 0], [3, 0.5]]) },
  { id: 'b-signet', name: 'Signet', builtin: true, sketch: rev([[0, 6], [6.5, 6], [7, 4.5], [4, 4], [3.5, 0]]) },
  { id: 'b-comfort', name: 'Comfort band', builtin: true, sketch: rev([[8, 2], [9.6, 1], [10, 0], [9.6, -1], [8, -2]], 64) },
  { id: 'b-teardrop', name: 'Teardrop', builtin: true, sketch: rev([[0, 12], [4, 8], [6, 3], [5, 0], [0, -1]]) },
  { id: 'b-bar', name: 'Bar (extrude)', builtin: true, sketch: ext([[-6, 1.5], [6, 1.5], [6, -1.5], [-6, -1.5]], 4) },
]

function readUser(): SketchPreset[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter(p => p && p.id && p.sketch) : []
  } catch { return [] }
}
function writeUser(list: SketchPreset[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* quota / private mode */ }
}

/** Built-ins first, then the user's saved presets. */
export function allPresets(): SketchPreset[] {
  return [...BUILTIN_PRESETS, ...readUser()]
}

/** Deep-copy a def so a spawned sketch can't mutate the stored preset. */
export function cloneSketch(s: SketchDef): SketchDef {
  return { ...s, points: s.points.map(([x, y]): [number, number] => [x, y]) }
}

export function addUserPreset(name: string, sketch: SketchDef): SketchPreset {
  const clean = (name || 'Profile').trim().slice(0, 40) || 'Profile'
  const preset: SketchPreset = { id: `u-${idSeed()}`, name: clean, sketch: cloneSketch(sketch) }
  writeUser([...readUser(), preset])
  return preset
}

export function removeUserPreset(id: string) {
  writeUser(readUser().filter(p => p.id !== id))
}

let seed = 0
function idSeed(): string {
  seed += 1
  return `${Date.now().toString(36)}${seed}`
}
