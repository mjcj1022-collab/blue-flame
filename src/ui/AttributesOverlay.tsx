import { useDesign } from '../state/design'
import { designFeatures, isHidden } from '../lib/features'

/**
 * The attribute table, floated on the left of the 3D stage. Lists every
 * rendered piece of the design; click to remove or restore any of them.
 */
export function AttributesOverlay() {
  const spec = useDesign(s => s.spec)
  const toggle = useDesign(s => s.toggleHidden)
  const feats = designFeatures(spec)
  if (!feats.length) return null
  const shown = feats.filter(f => !isHidden(spec, f.key)).length

  return (
    <div className="stage-attrs">
      <h5>Attributes <b>{shown}/{feats.length}</b></h5>
      {feats.map(f => {
        const hidden = isHidden(spec, f.key)
        return (
          <div key={f.key} className={`attr-row ${hidden ? 'off' : ''}`} onClick={() => toggle(f.key)}>
            <span>{f.label}</span>
            <button onClick={e => { e.stopPropagation(); toggle(f.key) }}>{hidden ? 'Add' : 'Hide'}</button>
          </div>
        )
      })}
    </div>
  )
}
