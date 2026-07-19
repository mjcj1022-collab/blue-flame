import { create } from 'zustand'
import { DEFAULT_SPEC, type DesignSpec, type FitProfile } from '../spec/types'
import type { WeightUnit } from '../lib/units'

interface DesignStore {
  spec: DesignSpec
  unit: WeightUnit
  compareOpen: boolean
  setRing: (patch: Partial<DesignSpec['ring']>) => void
  setAlloy: (id: string) => void
  setShape: (id: string) => void
  setStone: (id: string) => void
  setCarat: (ct: number) => void
  setSetting: (id: string) => void
  setFit: (fit: FitProfile) => void
  toggleUnit: () => void
  toggleCompare: () => void
  reset: () => void
}

export const useDesign = create<DesignStore>(set => ({
  spec: DEFAULT_SPEC,
  unit: 'g',
  compareOpen: true,
  setRing: patch => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, ...patch } } })),
  setAlloy: id => set(s => ({ spec: { ...s.spec, metal: { alloyId: id } } })),
  setShape: id => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, shapeId: id } } })),
  setStone: id => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, stoneTypeId: id } } })),
  setCarat: ct => set(s => ({ spec: { ...s.spec, center: { ...s.spec.center, carat: ct } } })),
  setSetting: id => set(s => ({ spec: { ...s.spec, setting: { typeId: id } } })),
  setFit: fit => set(s => ({ spec: { ...s.spec, ring: { ...s.spec.ring, fit } } })),
  toggleUnit: () => set(s => ({ unit: s.unit === 'g' ? 'dwt' : 'g' })),
  toggleCompare: () => set(s => ({ compareOpen: !s.compareOpen })),
  reset: () => set({ spec: DEFAULT_SPEC })
}))
