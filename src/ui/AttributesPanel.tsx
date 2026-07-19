import { useDesign } from '../state/design'
import { designFeatures, isHidden } from '../lib/features'

/** Lists every rendered piece of the design; remove or restore any of them. */
export function AttributesPanel() {
  const spec = useDesign(s => s.spec)
  const toggle = useDesign(s => s.toggleHidden)
  const feats = designFeatures(spec)
  if (!feats.length) return null
  const shown = feats.filter(f => !isHidden(spec, f.key)).length

  return (
    <div className="panel-block">
      <h4>Attributes <span className="mfg-sum"><b className="ok">{shown}/{feats.length} shown</b></span></h4>
      {feats.map(f => {
        const hidden = isHidden(spec, f.key)
        return (
          <div key={f.key} className="lib-row obj-row" onClick={() => toggle(f.key)}>
            <div className="lib-meta">
              <b style={{ opacity: hidden ? 0.45 : 1, textDecoration: hidden ? 'line-through' : 'none' }}>{f.label}</b>
              <small>{hidden ? 'removed' : 'shown'}</small>
            </div>
            <div className="lib-acts">
              <button className="mini" aria-pressed={!hidden} onClick={e => { e.stopPropagation(); toggle(f.key) }}>
                {hidden ? 'Add' : 'Remove'}
              </button>
            </div>
          </div>
        )
      })}
      <p className="disc">Remove any piece to drop it from the render, weight and cost. Add it back any time.</p>
    </div>
  )
}
