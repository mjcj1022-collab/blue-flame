import { useState } from 'react'
import { useDesign } from '../state/design'
import { ELEMENTS } from '../catalog/elements'
import { composeAlloy, compositionToAlloy, RECIPES, type AlloyMix } from '../lib/alloygen'

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')
const START: AlloyMix = { au: 58.5, cu: 29, ag: 12.5 }

export function MetalGenerator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const applyCustomAlloy = useDesign(s => s.applyCustomAlloy)
  const [mix, setMix] = useState<AlloyMix>(START)
  const [name, setName] = useState('My alloy')

  if (!open) return null

  const comp = composeAlloy(mix)
  const set = (id: string, g: number) => setMix(m => ({ ...m, [id]: g }))
  const loadRecipe = (r: AlloyMix, label: string) => { setMix({ ...r }); setName(label) }

  const apply = () => {
    const alloy = compositionToAlloy(comp, `cst-${Date.now()}`, name || 'Custom alloy')
    applyCustomAlloy(alloy)
    onClose()
  }

  return (
    <div className="lab-overlay" onClick={onClose}>
      <div className="lab" onClick={e => e.stopPropagation()}>
        <div className="lab-head">
          <div>
            <h2>Metal Lab</h2>
            <p>Compound an alloy from pure metals and watch its properties resolve.</p>
          </div>
          <button className="lab-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="lab-body">
          {/* Mixer */}
          <div className="lab-mix">
            <div className="lab-presets">
              {RECIPES.map(r => (
                <button key={r.id} className="mini" onClick={() => loadRecipe(r.mix, r.name)}>{r.name}</button>
              ))}
              <button className="mini danger" onClick={() => setMix({})}>Clear</button>
            </div>

            {ELEMENTS.map(e => {
              const g = mix[e.id] || 0
              const pct = comp.totalMass > 0 ? (g / comp.totalMass) * 100 : 0
              return (
                <div key={e.id} className="el-row">
                  <div className="el-head">
                    <span className="el-name"><span className="el-sw" style={{ background: hex(e.color) }} />{e.name} <i>{e.symbol}</i></span>
                    <span className="el-val">{g.toFixed(1)} g · {pct.toFixed(1)}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={0.5} value={g} onChange={ev => set(e.id, +ev.target.value)} />
                  <p className="el-role">{e.role}</p>
                </div>
              )
            })}
          </div>

          {/* Result */}
          <div className="lab-result">
            <div className="res-swatch" style={{ background: hex(comp.color) }}>
              <span>{comp.family.toUpperCase()}</span>
            </div>

            <div className="res-grid">
              {comp.karat !== null && <div className="res-cell"><b>{comp.karat.toFixed(1).replace(/\.0$/, '')}K</b><small>karat</small></div>}
              <div className="res-cell"><b>{comp.perThousand}</b><small>fine / 1000</small></div>
              <div className="res-cell"><b>{comp.density.toFixed(2)}</b><small>g/cm³</small></div>
              <div className="res-cell"><b>{comp.totalMass > 0 ? `${comp.meltApproxC}°` : '—'}</b><small>melt ≈</small></div>
            </div>

            <div className="res-hall">{comp.hallmark}</div>

            <div className="comp-bar">
              {comp.parts.map(p => (
                <div key={p.element.id} className="comp-seg" title={`${p.element.name} ${(p.fraction * 100).toFixed(1)}%`}
                  style={{ width: `${p.fraction * 100}%`, background: hex(p.element.color) }} />
              ))}
            </div>
            <div className="comp-legend">
              {comp.parts.map(p => (
                <span key={p.element.id}><i style={{ background: hex(p.element.color) }} />{p.element.symbol} {(p.fraction * 100).toFixed(1)}%</span>
              ))}
            </div>

            {comp.notes.map((n, i) => <div key={i} className="chk warn"><span>{n}</span></div>)}

            <div className="lab-apply">
              <input className="lib-name" value={name} onChange={e => setName(e.target.value)} placeholder="Alloy name" />
              <button className="primary" disabled={comp.totalMass === 0} onClick={apply}>Use in design</button>
            </div>
            <p className="disc">
              Melt point and colour are physically-grounded approximations for design intent —
              confirm against your caster’s data before pouring. Density and fineness are exact.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
