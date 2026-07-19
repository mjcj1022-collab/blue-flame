import type { FinishId } from '../spec/types'

/**
 * Surface finishes. `roughness` drives the PBR material in the viewer; `darken`
 * multiplies the metal colour (oxidised recesses read darker); `fee` is the
 * added hand-finishing labor.
 */
export interface Finish {
  id: FinishId
  name: string
  roughness: number
  darken: number
  fee: number
  note: string
}

export const FINISHES: Finish[] = [
  { id: 'polish',     name: 'High polish', roughness: 0.08, darken: 1.0,  fee: 0,  note: 'Mirror bright — the default jewelry finish.' },
  { id: 'satin',      name: 'Satin',       roughness: 0.30, darken: 0.98, fee: 20, note: 'Soft directional sheen from a fine abrasive.' },
  { id: 'matte',      name: 'Matte',       roughness: 0.50, darken: 0.96, fee: 20, note: 'Flat, non-reflective; hides fine scratches.' },
  { id: 'sandblast',  name: 'Sandblast',   roughness: 0.70, darken: 0.94, fee: 25, note: 'Uniform frosted texture from bead blasting.' },
  { id: 'hammered',   name: 'Hammered',    roughness: 0.35, darken: 0.97, fee: 60, note: 'Hand-planished facets that catch the light.' },
  { id: 'florentine', name: 'Florentine',  roughness: 0.45, darken: 0.95, fee: 70, note: 'Cross-hatched hand-engraved texture.' },
  { id: 'oxidized',   name: 'Oxidised',    roughness: 0.25, darken: 0.45, fee: 30, note: 'Blackened recesses for contrast; wears off high points.' }
]

export const finishById = (id: FinishId): Finish => FINISHES.find(f => f.id === id) ?? FINISHES[0]
