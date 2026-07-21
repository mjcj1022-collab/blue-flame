import { describe, it, expect, beforeEach } from 'vitest'

// jsdom isn't configured, so provide a minimal in-memory localStorage for the store.
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)) },
    removeItem: (k: string) => { mem.delete(k) },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() { return mem.size },
  } as Storage
}

import { BUILTIN_PRESETS, allPresets, addUserPreset, removeUserPreset, cloneSketch, profileThumb } from '../lib/sketchPresets'
import { useModeler } from '../state/modeler'
import type { SketchDef } from '../state/modeler'

const s = () => useModeler.getState()
const def: SketchDef = { points: [[0, 6], [5, 5], [4, 0]], mode: 'revolve', depth: 3, segments: 48, arc: 360 }

beforeEach(() => {
  localStorage.clear()
  useModeler.setState({ objects: [], selectedId: null, past: [], future: [], sketchPresets: allPresets() })
})

describe('sketch presets library', () => {
  it('ships built-in profiles, each a valid sketch', () => {
    expect(BUILTIN_PRESETS.length).toBeGreaterThan(3)
    for (const p of BUILTIN_PRESETS) {
      expect(p.builtin).toBe(true)
      expect(p.sketch.points.length).toBeGreaterThanOrEqual(3)
      expect(['revolve', 'extrude']).toContain(p.sketch.mode)
    }
  })

  it('saves a user preset to localStorage and lists it after the built-ins', () => {
    const p = addUserPreset('My band', def)
    expect(p.id.startsWith('u-')).toBe(true)
    const all = allPresets()
    expect(all.length).toBe(BUILTIN_PRESETS.length + 1)
    expect(all[all.length - 1].name).toBe('My band')
  })

  it('removes a user preset', () => {
    const p = addUserPreset('Temp', def)
    expect(allPresets().some(x => x.id === p.id)).toBe(true)
    removeUserPreset(p.id)
    expect(allPresets().some(x => x.id === p.id)).toBe(false)
  })

  it('clones the sketch so edits do not mutate the stored preset', () => {
    const p = addUserPreset('Clone check', def)
    p.sketch.points[0][0] = 999
    // reloading from storage still has the original value
    const reloaded = allPresets().find(x => x.name === 'Clone check')!
    expect(reloaded.sketch.points[0][0]).toBe(0)
  })

  it('cloneSketch deep-copies points', () => {
    const c = cloneSketch(def)
    c.points[0][0] = 42
    expect(def.points[0][0]).toBe(0)
  })
})

describe('profileThumb', () => {
  const coords = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number)

  it('builds a closed path that fits inside the box', () => {
    const { d, w, h } = profileThumb(def, 38, 26)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    const nums = coords(d)
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThanOrEqual(0); expect(nums[i]).toBeLessThanOrEqual(w)
      expect(nums[i + 1]).toBeGreaterThanOrEqual(0); expect(nums[i + 1]).toBeLessThanOrEqual(h)
    }
  })
  it('revolve mirrors the profile (double the vertices of the outline)', () => {
    const revPts = def.points.length
    const { d } = profileThumb(def, 38, 26)
    const verts = (d.match(/[ML]/g) || []).length
    expect(verts).toBe(revPts * 2)
  })
  it('every built-in yields a non-empty path', () => {
    for (const p of BUILTIN_PRESETS) expect(profileThumb(p.sketch).d.length).toBeGreaterThan(0)
  })
  it('is empty for a degenerate profile', () => {
    expect(profileThumb({ ...def, points: [[0, 0]] }).d).toBe('')
  })
})

describe('store preset actions', () => {
  it('applySketchPreset spawns a new sketch object from the preset', () => {
    const before = s().objects.length
    const id = s().applySketchPreset({ id: 'b-dome', name: 'Dome', builtin: true, sketch: def })
    expect(s().objects.length).toBe(before + 1)
    const obj = s().objects.find(o => o.id === id)!
    expect(obj.kind).toBe('sketch')
    expect(obj.params?.sketch?.points).toEqual(def.points)
    expect(obj.params?.sketch?.points).not.toBe(def.points)   // cloned, not shared
  })

  it('saveSketchPreset then deleteSketchPreset round-trips through the store', () => {
    s().saveSketchPreset('Store band', def)
    const added = s().sketchPresets.find(p => p.name === 'Store band')
    expect(added).toBeTruthy()
    s().deleteSketchPreset(added!.id)
    expect(s().sketchPresets.some(p => p.id === added!.id)).toBe(false)
  })
})
