import { create } from 'zustand'

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'tube'
export type JewelryKind = 'shank' | 'gem' | 'head' | 'bezel'
export type SculptKind = PrimitiveKind | JewelryKind
export type SculptMaterial = 'metal' | 'gem'
export type TransformMode = 'translate' | 'rotate' | 'scale'
export type ShankProfile = 'round' | 'flat' | 'dshape' | 'knife' | 'comfort'

/** Parameters for the jewelry-native builders. */
export interface SculptParams {
  ringSize?: number       // shank — US size
  profile?: ShankProfile  // shank
  width?: number          // shank / bezel — mm
  thickness?: number      // shank — mm
  shapeId?: string        // gem — stone shape
  carat?: number          // gem
  prongs?: number         // head
  stoneW?: number         // head / bezel — stone width mm
  height?: number         // head / bezel — mm
  wall?: number           // bezel wall — mm
}

export interface SculptObject {
  id: string
  kind: SculptKind | 'mesh'
  name: string
  position: [number, number, number]
  rotation: [number, number, number]   // radians
  scale: [number, number, number]
  size: number
  material: SculptMaterial
  color: number
  params?: SculptParams
  vertices?: number[]                   // baked positions for 'mesh' (boolean) results
}

const GOLD = 0xD8B36A
const GEM = 0x8FD0E8
export const SCULPT_COLORS = { metal: GOLD, gem: GEM }

const LABEL: Record<SculptKind, string> = {
  box: 'Box', sphere: 'Sphere', cylinder: 'Cylinder', cone: 'Cone', torus: 'Torus', tube: 'Tube',
  shank: 'Shank', gem: 'Gem', head: 'Prong head', bezel: 'Bezel'
}

const TWO_PI = Math.PI * 2

/** Per-kind spawn defaults. */
function defaults(kind: SculptKind): Pick<SculptObject, 'position' | 'size' | 'material' | 'color' | 'params'> {
  switch (kind) {
    case 'shank':
      return { position: [0, 0, 0], size: 6, material: 'metal', color: GOLD, params: { ringSize: 7, profile: 'round', width: 2.2, thickness: 1.8 } }
    case 'gem':
      return { position: [0, 6, 0], size: 6, material: 'gem', color: GEM, params: { shapeId: 'rd', carat: 1 } }
    case 'head':
      return { position: [0, 6, 0], size: 6, material: 'metal', color: GOLD, params: { prongs: 4, stoneW: 6.5, height: 4 } }
    case 'bezel':
      return { position: [0, 6, 0], size: 6, material: 'metal', color: GOLD, params: { stoneW: 6.5, height: 3, wall: 0.6 } }
    case 'torus':
    case 'tube':
      return { position: [0, 1.5, 0], size: 6, material: 'metal', color: GOLD }
    default:
      return { position: [0, 3, 0], size: 6, material: 'metal', color: GOLD }
  }
}

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  return c?.randomUUID ? c.randomUUID() : 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

interface ModelerStore {
  objects: SculptObject[]
  selectedId: string | null
  mode: TransformMode
  alloyId: string
  add: (kind: SculptKind) => void
  addMesh: (obj: Omit<SculptObject, 'id' | 'name'> & { name?: string }) => string
  update: (id: string, patch: Partial<SculptObject>) => void
  updateParams: (id: string, patch: Partial<SculptParams>) => void
  remove: (id: string) => void
  duplicate: (id: string) => void
  arrayCircular: (id: string, count: number) => void
  arrayLinear: (id: string, count: number, spacing: number) => void
  select: (id: string | null) => void
  setMode: (mode: TransformMode) => void
  setAlloy: (id: string) => void
  clear: () => void
  load: (objects: SculptObject[]) => void
}

export const useModeler = create<ModelerStore>((set, get) => ({
  objects: [],
  selectedId: null,
  mode: 'translate',
  alloyId: '14ky',

  add: kind => {
    const n = get().objects.filter(o => o.kind === kind).length + 1
    const d = defaults(kind)
    const obj: SculptObject = { id: newId(), kind, name: `${LABEL[kind]} ${n}`, rotation: [0, 0, 0], scale: [1, 1, 1], ...d }
    set(s => ({ objects: [...s.objects, obj], selectedId: obj.id }))
  },

  addMesh: obj => {
    const id = newId()
    const full: SculptObject = { id, name: obj.name ?? 'Result', ...obj }
    set(s => ({ objects: [...s.objects, full], selectedId: id }))
    return id
  },

  update: (id, patch) => set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...patch } : o) })),
  updateParams: (id, patch) => set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, params: { ...o.params, ...patch } } : o) })),

  remove: id => set(s => ({ objects: s.objects.filter(o => o.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),

  duplicate: id => {
    const src = get().objects.find(o => o.id === id)
    if (!src) return
    const copy: SculptObject = { ...src, id: newId(), name: `${src.name} copy`, position: [src.position[0] + 2, src.position[1], src.position[2] + 2] }
    set(s => ({ objects: [...s.objects, copy], selectedId: copy.id }))
  },

  /** Array around the Y axis at the object's current radius — eternity / halo / pavé rings. */
  arrayCircular: (id, count) => {
    const src = get().objects.find(o => o.id === id)
    if (!src || count < 2) return
    const [x, y, z] = src.position
    let r = Math.hypot(x, z)
    if (r < 0.5) r = 8   // sitting at the centre — array on a default ring radius
    const a0 = Math.atan2(z, x)
    const copies: SculptObject[] = []
    for (let i = 1; i < count; i++) {
      const a = a0 + (i / count) * TWO_PI
      copies.push({ ...src, id: newId(), name: `${src.name} ${i + 1}`, position: [Math.cos(a) * r, y, Math.sin(a) * r], rotation: [src.rotation[0], -a + Math.PI / 2, src.rotation[2]] })
    }
    if (r === 8 && Math.hypot(x, z) < 0.5) src.position = [r, y, 0]   // move original onto the ring too
    set(s => ({ objects: [...s.objects.map(o => o.id === id ? { ...o, position: src.position } : o), ...copies] }))
  },

  arrayLinear: (id, count, spacing) => {
    const src = get().objects.find(o => o.id === id)
    if (!src || count < 2) return
    const copies: SculptObject[] = []
    for (let i = 1; i < count; i++) {
      copies.push({ ...src, id: newId(), name: `${src.name} ${i + 1}`, position: [src.position[0] + i * spacing, src.position[1], src.position[2]] })
    }
    set(s => ({ objects: [...s.objects, ...copies] }))
  },

  select: id => set({ selectedId: id }),
  setMode: mode => set({ mode }),
  setAlloy: id => set({ alloyId: id }),
  clear: () => set({ objects: [], selectedId: null }),
  load: objects => set({ objects, selectedId: null })
}))
