import type { DesignSpec } from '../spec/types'
import { sizeToDiameter } from './sizing'

/** Approximate engraved character width in mm, by font. */
const CHAR_W: Record<string, number> = { Serif: 1.9, Sans: 1.7, Script: 2.2, Block: 2.0 }

export const ENGRAVE_FONTS = ['Serif', 'Sans', 'Script', 'Block']
export const ENGRAVE_PER_CHAR = 4   // $ per character, hand or laser

/**
 * How many characters actually fit, computed from the real engraving surface —
 * inside circumference for inside text, the interrupted outside band for
 * outside text. Non-ring pieces use a nominal surface length.
 */
export function engraveCapacity(spec: DesignSpec): number {
  const font = CHAR_W[spec.engraving?.font ?? 'Serif'] ?? 1.9
  if (spec.category === 'ring') {
    const insideDia = sizeToDiameter(spec.ring.size)
    if ((spec.engraving?.placement ?? 'inside') === 'inside') {
      return Math.floor((Math.PI * insideDia * 0.82) / font)
    }
    const outsideCirc = Math.PI * (insideDia + 2 * spec.ring.thickness)
    return Math.floor((outsideCirc * 0.6) / font)   // head/gallery interrupt the outside
  }
  const nominalMm: Partial<Record<DesignSpec['category'], number>> = {
    pendant: 40, earring: 14, bracelet: 60, necklace: 32
  }
  return Math.floor((nominalMm[spec.category] ?? 30) / font)
}

export const engraveFee = (spec: DesignSpec): number =>
  (spec.engraving?.text?.trim().length ?? 0) * ENGRAVE_PER_CHAR

export const engraveOverflow = (spec: DesignSpec): number =>
  Math.max(0, (spec.engraving?.text?.length ?? 0) - engraveCapacity(spec))
