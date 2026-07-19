/** US ring size to inside diameter, standard trade formula. */
export const sizeToDiameter = (size: number) => 11.6307 + 0.8128 * size
export const diameterToSize = (mm: number) => (mm - 11.6307) / 0.8128
export const sizeToCircumference = (size: number) => sizeToDiameter(size) * Math.PI

const FRACTIONS: Record<number, string> = { 0: '', 0.25: '\u00BC', 0.5: '\u00BD', 0.75: '\u00BE' }

export const formatSize = (size: number) => {
  const whole = Math.floor(size)
  const frac = Math.round((size - whole) * 100) / 100
  return `${whole}${FRACTIONS[frac] ?? ''}`
}

export interface FitAdvice {
  level: 'none' | 'note' | 'warn'
  title?: string
  body?: string
  suggested?: number
}

/**
 * Band-width compensation. A wide band contacts more of the finger and reads
 * smaller than a narrow one at the same nominal size. Ignoring this is the
 * single most common cause of a resize on a finished ring.
 */
export function fitAdvice(size: number, width: number, fit: string): FitAdvice {
  if (width >= 6) {
    return {
      level: 'warn',
      title: 'Size up recommended',
      body: `A ${width.toFixed(1)} mm band sits noticeably tighter than a narrow one. Order size ${formatSize(size + 0.5)}${fit === 'comfort' ? `, or ${formatSize(size + 0.25)} since comfort fit already eases entry` : ''}.`,
      suggested: size + 0.5
    }
  }
  if (width >= 4.5) {
    return {
      level: 'note',
      title: 'Consider a quarter size up',
      body: 'Bands over 4.5 mm read about a quarter size small on most fingers.',
      suggested: size + 0.25
    }
  }
  return { level: 'none' }
}
