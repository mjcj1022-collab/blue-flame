import { create } from 'zustand'

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'tube'
export type SculptMaterial = 'metal' | 'gem'
export type TransformMode = 'translate' | 'rotate' | 'scale'

/**
 * A sculpt object is a primitive (or a boolean result) with a transform. Boolean
 * results carry baked vertex positions so they persist; primitives are rebuilt
 * from kind + size. This is a constructive-solid-geometry modeler — the way
 * jewelry CAD actually works.
 */
export interface SculptObject {
  id: string
  kind: PrimitiveKind | 'mesh'
  name: string
  position: [number, number, number]
  rotation: [number, number, number]   // radians
  scale: [number, number, number]
  size: number
  material: SculptMaterial
  color: number
  vertices?: number[]                   // baked positions for 'mesh' (boolean) results
}

const PRIM_LABEL: Record<PrimitiveKind, string> = {
  box: 'Box', sphere: 'Sphere', cylinder: 'Cylinder', cone: 'Cone', torus: 'Torus', tube: 'Tube'
}

const GOLD = 0xD8B36A
const GEM = 0x8FD0E8

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  return c?.randomUUID ? c.randomUUID() : 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

interface ModelerStore {
  objects: SculptObject[]
  selectedId: string | null
  mode: TransformMode
  add: (kind: PrimitiveKind) => void
  addMesh: (obj: Omit<SculptObject, 'id' | 'name'> & { name?: string }) => string
  update: (id: string, patch: Partial<SculptObject>) => void
  remove: (id: string) => void
  duplicate: (id: string) => void
  select: (id: string | null) => void
  setMode: (mode: TransformMode) => void
  clear: () => void
  load: (objects: SculptObject[]) => void
}

export const useModeler = create<ModelerStore>((set, get) => ({
  objects: [],
  selectedId: null,
  mode: 'translate',

  add: kind => {
    const n = get().objects.filter(o => o.kind === kind).length + 1
    const obj: SculptObject = {
      id: newId(), kind, name: `${PRIM_LABEL[kind]} ${n}`,
      position: [0, kind === 'torus' ? 1.5 : 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      size: 6, material: 'metal', color: GOLD
    }
    set(s => ({ objects: [...s.objects, obj], selectedId: obj.id }))
  },

  addMesh: obj => {
    const id = newId()
    const full: SculptObject = { id, name: obj.name ?? 'Result', ...obj }
    set(s => ({ objects: [...s.objects, full], selectedId: id }))
    return id
  },

  update: (id, patch) => set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...patch } : o) })),

  remove: id => set(s => ({ objects: s.objects.filter(o => o.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),

  duplicate: id => {
    const src = get().objects.find(o => o.id === id)
    if (!src) return
    const copy: SculptObject = { ...src, id: newId(), name: `${src.name} copy`, position: [src.position[0] + 2, src.position[1], src.position[2] + 2] }
    set(s => ({ objects: [...s.objects, copy], selectedId: copy.id }))
  },

  select: id => set({ selectedId: id }),
  setMode: mode => set({ mode }),
  clear: () => set({ objects: [], selectedId: null }),
  load: objects => set({ objects, selectedId: null })
}))

export const SCULPT_COLORS = { metal: GOLD, gem: GEM }
