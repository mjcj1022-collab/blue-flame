import { useDesign } from '../state/design'
import { computePrice } from '../lib/pricing'
import { alloyById, shapeById, stoneById, settingById, stoneMm } from '../catalog'
import { sizeToDiameter, formatSize } from '../lib/sizing'
import { money, gToDwt } from '../lib/units'

function techSheet(spec: ReturnType<typeof useDesign.getState>['spec']) {
  const p = computePrice(spec)
  const m = p.metal
  const alloy = alloyById(spec.metal.alloyId)
  const shape = shapeById(spec.center.shapeId)
  const stone = stoneById(spec.center.stoneTypeId)
  const setting = settingById(spec.setting.typeId)
  const mm = stoneMm(shape, spec.center.carat)

  return [
    'MANDREL — TECH SHEET',
    '',
    'RING',
    `  Inside diameter   ${sizeToDiameter(spec.ring.size).toFixed(2)} mm  (US ${formatSize(spec.ring.size)})`,
    `  Band              ${spec.ring.width.toFixed(1)} x ${spec.ring.thickness.toFixed(1)} mm, ${spec.ring.fit} fit`,
    `  Hallmark          ${alloy.hallmark}`,
    `  Resizable         ${setting.resizeRange}`,
    '',
    'METAL',
    `  Alloy             ${alloy.name}, density ${alloy.density} g/cm3, ${(alloy.fine * 100).toFixed(1)}% ${alloy.symbol}`,
    `  Model volume      ${Math.round(m.volume).toLocaleString()} mm3`,
    `  Cast weight       ${m.cast.toFixed(2)} g   (${gToDwt(m.cast).toFixed(2)} dwt)`,
    `  Finished weight   ${m.finished.toFixed(2)} g   (${gToDwt(m.finished).toFixed(2)} dwt)`,
    `  Finishing loss    ${m.lossGrams.toFixed(2)} g at ${(m.finishingLoss * 100).toFixed(1)}%`,
    `  Fine ${alloy.symbol} content    ${m.fineGrams.toFixed(2)} g   (${m.fineOzt.toFixed(4)} ozt)`,
    `  Sprue + button    ${(m.sprue + m.button).toFixed(2)} g`,
    `  METAL TO POUR     ${m.pour.toFixed(2)} g   (${gToDwt(m.pour).toFixed(2)} dwt)`,
    `  Pattern weight    ${m.patternWax.toFixed(2)} g wax  /  ${m.patternResin.toFixed(2)} g castable resin`,
    '',
    'STONE',
    `  Center            ${spec.center.carat.toFixed(2)} ct ${shape.name}, ${mm.length.toFixed(2)} x ${mm.width.toFixed(2)} mm`,
    `  Material          ${stone.name} - ${stone.variety}, Mohs ${stone.mohs}`,
    `  Treatment         ${stone.treatment ?? 'None disclosed'}`,
    `  Setting           ${setting.name} (${setting.variety})`,
    '',
    'PRICE',
    `  Net metal         ${money(p.metalCost)}`,
    `  Center stone      ${money(p.stoneCost)}`,
    `  Setting labor     ${money(p.settingFee)}`,
    `  Cast and finish   ${money(p.finishFee)}`,
    `  ESTIMATE          ${money(p.total)}`,
    '',
    'DISCLOSURE',
    `  ${stone.labGrown ? 'LABORATORY-GROWN. Must be disclosed on all documents and advertising.' : 'Natural origin. Treatments as noted above.'}`,
    stone.care ? `  Care: ${stone.care}` : ''
  ].filter(Boolean).join('\n')
}

export function QuotePanel() {
  const spec = useDesign(s => s.spec)
  const p = computePrice(spec)
  const alloy = alloyById(spec.metal.alloyId)

  const download = () => {
    const blob = new Blob([techSheet(spec)], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mandrel-techsheet-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copySpec = async () => {
    await navigator.clipboard.writeText(JSON.stringify(spec, null, 2))
  }

  return (
    <div className="panel-block quote">
      <div className="qline"><span>Net metal — {alloy.name}</span><span>{money(p.metalCost)}</span></div>
      <div className="qline"><span>Center stone</span><span>{money(p.stoneCost)}</span></div>
      <div className="qline"><span>Setting labor</span><span>{money(p.settingFee)}</span></div>
      <div className="qline"><span>Cast, finish, polish</span><span>{money(p.finishFee)}</span></div>
      <div className="qtotal">
        <span className="lbl">Estimate</span>
        <span className="amt">{money(p.total)}</span>
      </div>
      <div className="qact">
        <button className="primary" onClick={download}>Tech sheet</button>
        <button className="ghost" onClick={copySpec}>Copy spec</button>
      </div>
      <p className="disc">
        Metal priced from illustrative spot values. Wire <code>Alloy.spot</code> to a live feed
        before quoting a client.
      </p>
    </div>
  )
}
