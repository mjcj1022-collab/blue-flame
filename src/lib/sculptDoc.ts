import type { SculptObject } from '../state/modeler'
import { alloyById, stoneById } from '../catalog'
import { sculptEstimate, boundingSize } from './sculpt'
import { money, gToDwt } from './units'

const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length))

/**
 * A production tech sheet for a custom sculpt: a bill of materials (every part
 * with its bounding size and material), the metal totals, gemstones, and the
 * same retail estimate the panel shows. Plain monospace text for textToPdf().
 */
export function sculptTechSheet(objects: SculptObject[], alloyId: string, brand = 'Blue Flame'): string {
  const alloy = alloyById(alloyId)
  const est = sculptEstimate(objects, alloyId)
  const gems = objects.filter(o => o.kind === 'gem')

  const bom = objects.map((o, i) => {
    const [w, h, d] = boundingSize(o)
    const size = `${w.toFixed(1)} x ${h.toFixed(1)} x ${d.toFixed(1)} mm`
    const mat = o.kind === 'gem'
      ? `${stoneById(o.params?.stoneTypeId ?? 'dia').name}, ${(o.params?.carat ?? 0).toFixed(2)} ct`
      : alloy.name
    return `  ${pad(`${i + 1}. ${o.name}`, 22)}${pad(o.kind, 8)}${pad(size, 22)}${mat}`
  })

  return [
    `${brand.toUpperCase()} — CUSTOM SCULPT TECH SHEET`,
    '',
    `PARTS  ${objects.length} total`,
    ...bom,
    '',
    'METAL',
    `  Alloy             ${alloy.name}, density ${alloy.density} g/cm3`,
    `  Model volume      ${Math.round(est.vol).toLocaleString()} mm3`,
    `  Cast weight       ${est.castG.toFixed(2)} g   (${gToDwt(est.castG).toFixed(2)} dwt)`,
    gems.length > 0 ? `  Gemstones         ${gems.length} stone${gems.length === 1 ? '' : 's'}, ${est.carats.toFixed(2)} ct total` : '',
    '',
    'ESTIMATE',
    `  Metal             ${money(est.metalCost)}`,
    ...(gems.length > 0 ? [
      `  Stones (${est.carats.toFixed(2)} ct)   ${money(est.stoneCost)}`,
      `  Setting labor     ${money(est.settingLabor)}`
    ] : []),
    `  Cast, finish      ${money(est.finishFee)}`,
    `  ESTIMATE          ${money(est.total)}`,
    '',
    'PRODUCTION NOTES',
    '  Geometry is a custom sculpt — confirm wall thickness and stone seats',
    '  before casting. Overlapping metal parts double-count in the volume',
    '  until unioned; use "Fuse metal" for a single watertight solid, then',
    '  export STL for printing or milling.'
  ].filter(Boolean).join('\n')
}
