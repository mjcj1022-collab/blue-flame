/**
 * Diamond grading — the 4Cs beyond carat. Multipliers are relative to the
 * catalog's baseline (G colour · VS2 clarity · Excellent cut · no fluorescence),
 * which is what StoneType.rate already assumes. Illustrative, not a price sheet.
 */
export interface Grade { id: string; label: string; mult: number }

export const CUT_GRADES: Grade[] = [
  { id: 'ex', label: 'Excellent', mult: 1.00 },
  { id: 'vg', label: 'Very Good', mult: 0.93 },
  { id: 'gd', label: 'Good', mult: 0.84 },
  { id: 'fr', label: 'Fair', mult: 0.72 },
  { id: 'pr', label: 'Poor', mult: 0.58 }
]

export const COLOR_GRADES: Grade[] = [
  { id: 'D', label: 'D', mult: 1.28 }, { id: 'E', label: 'E', mult: 1.21 }, { id: 'F', label: 'F', mult: 1.14 },
  { id: 'G', label: 'G', mult: 1.00 }, { id: 'H', label: 'H', mult: 0.90 }, { id: 'I', label: 'I', mult: 0.80 },
  { id: 'J', label: 'J', mult: 0.71 }, { id: 'K', label: 'K', mult: 0.62 }, { id: 'L', label: 'L', mult: 0.55 },
  { id: 'M', label: 'M', mult: 0.49 }
]

export const CLARITY_GRADES: Grade[] = [
  { id: 'fl', label: 'FL', mult: 1.45 }, { id: 'if', label: 'IF', mult: 1.32 },
  { id: 'vvs1', label: 'VVS1', mult: 1.22 }, { id: 'vvs2', label: 'VVS2', mult: 1.15 },
  { id: 'vs1', label: 'VS1', mult: 1.07 }, { id: 'vs2', label: 'VS2', mult: 1.00 },
  { id: 'si1', label: 'SI1', mult: 0.86 }, { id: 'si2', label: 'SI2', mult: 0.73 },
  { id: 'i1', label: 'I1', mult: 0.52 }, { id: 'i2', label: 'I2', mult: 0.40 }, { id: 'i3', label: 'I3', mult: 0.30 }
]

export const FLUOR_GRADES: Grade[] = [
  { id: 'none', label: 'None', mult: 1.00 }, { id: 'faint', label: 'Faint', mult: 0.99 },
  { id: 'medium', label: 'Medium', mult: 0.96 }, { id: 'strong', label: 'Strong', mult: 0.91 }
]

export const CERT_LABS = ['none', 'GIA', 'IGI', 'AGS', 'GCAL'] as const
export type CertLab = typeof CERT_LABS[number]

export interface Grading { cut: string; color: string; clarity: string; fluorescence: string }
export interface Cert { lab: CertLab; number: string }

export const DEFAULT_GRADING: Grading = { cut: 'ex', color: 'G', clarity: 'vs2', fluorescence: 'none' }
export const DEFAULT_CERT: Cert = { lab: 'none', number: '' }

const by = (list: Grade[], id: string) => list.find(g => g.id === id) ?? list[0]

/** Stones the 4Cs apply to (colourless, faceted). */
export const isGradeable = (stoneTypeId: string): boolean =>
  ['dia', 'lab', 'moi', 'wsp'].includes(stoneTypeId)

export function gradeMultiplier(g: Grading): number {
  return by(CUT_GRADES, g.cut).mult * by(COLOR_GRADES, g.color).mult * by(CLARITY_GRADES, g.clarity).mult * by(FLUOR_GRADES, g.fluorescence).mult
}

export const gradeLabel = (g: Grading): string =>
  `${by(COLOR_GRADES, g.color).label} · ${by(CLARITY_GRADES, g.clarity).label} · ${by(CUT_GRADES, g.cut).label} cut`

/** Warm tint a colourless stone picks up as colour drops from D toward M. */
export function colorTint(colorId: string): number {
  const i = COLOR_GRADES.findIndex(g => g.id === colorId)
  const t = Math.max(0, Math.min(1, i / (COLOR_GRADES.length - 1)))   // 0 = D, 1 = M
  // white → warm ivory
  const r = 255, g = Math.round(255 - t * 22), b = Math.round(255 - t * 66)
  return (r << 16) | (g << 8) | b
}

/** How clarity reads optically — cleaner stones transmit more and haze less. */
export function clarityOptics(clarityId: string): { transmission: number; roughness: number } {
  const i = CLARITY_GRADES.findIndex(c => c.id === clarityId)
  const t = i / (CLARITY_GRADES.length - 1)   // 0 = FL, 1 = I3
  return { transmission: 0.96 - t * 0.34, roughness: 0.02 + t * 0.22 }
}
