import { useState } from 'react'
import { useModeler, SCULPT_COLORS, type PrimitiveKind, type SculptMaterial } from '../state/modeler'
import { booleanOp, modelerToStl, type BooleanOp } from '../lib/sculpt'

const PRIMS: [PrimitiveKind, string][] = [
  ['box', 'Box'], ['sphere', 'Sphere'], ['cylinder', 'Cylinder'], ['cone', 'Cone'], ['torus', 'Torus'], ['tube', 'Tube']
]
const OPS: [BooleanOp, string][] = [['union', 'Union'], ['subtract', 'Subtract'], ['intersect', 'Intersect']]
const KEY = 'mandrel.sculpt.v1'

export function ModelerPanel() {
  const { objects, selectedId, mode, add, addMesh, update, remove, duplicate, select, setMode, clear, load } = useModeler()
  const sel = objects.find(o => o.id === selectedId) ?? null
  const others = objects.filter(o => o.id !== selectedId)
  const [otherId, setOtherId] = useState<string>('')
  const [msg, setMsg] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const doBoolean = (op: BooleanOp) => {
    const b = objects.find(o => o.id === otherId)
    if (!sel || !b) { flash('Pick a second shape to combine with.'); return }
    try {
      const vertices = booleanOp(sel, b, op)
      if (!vertices.length) { flash('The shapes don’t overlap — nothing to combine.'); return }
      addMesh({ kind: 'mesh', vertices, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0, material: sel.material, color: sel.color, name: `${op} result` })
      remove(sel.id); remove(b.id); setOtherId('')
    } catch { flash('Boolean failed on this geometry.') }
  }

  const exportStl = () => {
    if (!objects.length) { flash('Nothing to export.'); return }
    const blob = new Blob([modelerToStl(objects)], { type: 'model/stl' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `mandrel-sculpt-${Date.now()}.stl`; a.click(); URL.revokeObjectURL(a.href)
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(objects)); flash('Saved.') } catch { flash('Save failed.') } }
  const restore = () => { try { const raw = localStorage.getItem(KEY); if (raw) { load(JSON.parse(raw)); flash('Loaded.') } else flash('No saved sculpt.') } catch { flash('Load failed.') } }

  return (
    <>
      <div className="panel-block">
        <h4>Add shape</h4>
        <div className="opts c2">
          {PRIMS.map(([k, label]) => <button key={k} className="opt" onClick={() => add(k)}>{label}</button>)}
        </div>
        <h4 style={{ marginTop: 18 }}>Tool</h4>
        <div className="opts">
          {(['translate', 'rotate', 'scale'] as const).map(m => (
            <button key={m} className="opt" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'translate' ? 'Move' : m === 'rotate' ? 'Rotate' : 'Scale'}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <h4>Objects <span className="mfg-sum"><b className="ok">{objects.length}</b></span></h4>
        {objects.length === 0 && <p className="disc">No shapes yet. Add one above.</p>}
        {objects.map(o => (
          <div key={o.id} className={`lib-row obj-row ${o.id === selectedId ? 'sel' : ''}`} onClick={() => select(o.id)}>
            <div className="lib-meta"><b>{o.name}</b><small>{o.kind}{o.material === 'gem' ? ' · gem' : ''}</small></div>
            <div className="lib-acts">
              <button className="mini" onClick={e => { e.stopPropagation(); duplicate(o.id) }}>Dup</button>
              <button className="mini danger" onClick={e => { e.stopPropagation(); remove(o.id) }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div className="panel-block">
          <h4>{sel.name}</h4>
          <div className="opts c2">
            {(['metal', 'gem'] as SculptMaterial[]).map(m => (
              <button key={m} className="opt" aria-pressed={sel.material === m} onClick={() => update(sel.id, { material: m, color: SCULPT_COLORS[m] })}>
                {m === 'metal' ? 'Metal' : 'Gemstone'}
              </button>
            ))}
          </div>

          {sel.kind !== 'mesh' && (
            <>
              <div className="row" style={{ marginTop: 14 }}><label>Size</label><span className="val">{sel.size.toFixed(1)}</span></div>
              <input type="range" min={1} max={30} step={0.5} value={sel.size} onChange={e => update(sel.id, { size: +e.target.value })} />
            </>
          )}
          <div className="row" style={{ marginTop: 14 }}><label>Height</label><span className="val">{sel.position[1].toFixed(1)}</span></div>
          <input type="range" min={0} max={30} step={0.5} value={sel.position[1]} onChange={e => update(sel.id, { position: [sel.position[0], +e.target.value, sel.position[2]] })} />
          <div className="row" style={{ marginTop: 12 }}><label>Uniform scale</label><span className="val">{sel.scale[0].toFixed(2)}×</span></div>
          <input type="range" min={0.1} max={4} step={0.05} value={sel.scale[0]} onChange={e => { const v = +e.target.value; update(sel.id, { scale: [v, v, v] }) }} />

          <h4 style={{ marginTop: 20 }}>Boolean</h4>
          <select className="lib-name" style={{ width: '100%' }} value={otherId} onChange={e => setOtherId(e.target.value)}>
            <option value="">Combine with…</option>
            {others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <div className="opts" style={{ marginTop: 8 }}>
            {OPS.map(([op, label]) => <button key={op} className="opt" onClick={() => doBoolean(op)}>{label}</button>)}
          </div>
          <p className="disc">Subtract removes the second shape from this one. The result is a single new object.</p>
        </div>
      )}

      <div className="panel-block quote">
        <div className="qact">
          <button className="primary" onClick={exportStl}>Export STL</button>
          <button className="ghost" onClick={save}>Save</button>
          <button className="ghost" onClick={restore}>Load</button>
        </div>
        <div className="qact" style={{ marginTop: 8 }}>
          <button className="ghost" onClick={clear}>Clear all</button>
        </div>
        {msg && <p className="disc">{msg}</p>}
      </div>
    </>
  )
}
