import type { DesignSpec } from '../spec/types'
import { settingById, shapeById, stoneById, stoneMm } from '../catalog'
import { computeMetal, type MetalResult } from './metal'

export const FINISH_FEE = 95     // cast, file, sand, pre-polish, final polish
export const MARGIN = 1.35

export interface PriceResult {
  metal: MetalResult
  metalCost: number
  stoneCost: number
  settingFee: number
  finishFee: number
  subtotal: number
  total: number
}

export function computePrice(spec: DesignSpec): PriceResult {
  const metal = computeMetal(spec)
  const stone = stoneById(spec.center.stoneTypeId)
  const setting = settingById(spec.setting.typeId)

  const stoneCost = stone.rate * Math.pow(spec.center.carat, stone.exponent)
  const subtotal = metal.netMetalCost + stoneCost + setting.fee + FINISH_FEE

  return {
    metal,
    metalCost: metal.netMetalCost,
    stoneCost,
    settingFee: setting.fee,
    finishFee: FINISH_FEE,
    subtotal,
    total: subtotal * MARGIN
  }
}

export interface Guardrail {
  level: 'warn' | 'note' | 'ok'
  title: string
  body: string
}

/** Wearability and setting advice derived from the spec. */
export function guardrails(spec: DesignSpec): Guardrail[] {
  const out: Guardrail[] = []
  const stone = stoneById(spec.center.stoneTypeId)
  const setting = settingById(spec.setting.typeId)
  const shape = shapeById(spec.center.shapeId)
  const { width } = stoneMm(shape, spec.center.carat)

  if (stone.mohs < 7) {
    out.push({
      level: 'warn',
      title: 'Not for daily wear',
      body: `${stone.name} is Mohs ${stone.mohs}. It will abrade and chip in a ring worn every day. Better suited to a pendant or an occasional-wear piece.${stone.care ? ' ' + stone.care : ''}`
    })
  } else if (stone.mohs < 8) {
    out.push({
      level: 'note',
      title: 'Wear with care',
      body: `Mohs ${stone.mohs}. Fine for a ring, but remove it for manual work.${stone.care ? ' ' + stone.care : ''}`
    })
  }

  if (setting.bezel && stone.mohs < 8) {
    out.push({ level: 'ok', title: 'Good pairing', body: 'A bezel protects the girdle, which is the right call for a softer stone.' })
  }
  if (!setting.bezel && setting.prongs === 4 && spec.center.carat >= 2) {
    out.push({ level: 'note', title: 'Consider six prongs', body: `At ${spec.center.carat.toFixed(2)} ct, four prongs leave more girdle exposed than most setters are comfortable with.` })
  }
  if (['ma', 'pe', 'he'].includes(shape.id) && !setting.bezel && setting.prongs < 6) {
    out.push({ level: 'note', title: 'Protect the point', body: `${shape.name} cuts have a vulnerable tip. Specify a V-prong at the point or move to a bezel.` })
  }
  if (width > spec.ring.width * 3.4 && spec.ring.thickness < 1.8) {
    out.push({ level: 'warn', title: 'Shank may be under-built', body: `A ${width.toFixed(1)} mm stone on a ${spec.ring.width.toFixed(1)} x ${spec.ring.thickness.toFixed(1)} mm shank is top-heavy and will spin. Increase thickness to at least 1.8 mm.` })
  }
  if (stone.labGrown) {
    out.push({ level: 'note', title: 'Disclosure required', body: 'Laboratory-grown origin must be disclosed on the quote, the appraisal and any advertising. Handled automatically on generated documents.' })
  }
  return out
}
