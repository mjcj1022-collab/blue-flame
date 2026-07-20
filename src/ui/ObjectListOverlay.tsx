import { useModeler } from '../state/modeler'

/** The sculpt object list, floated on the left of the modeler stage — select
 *  a part or remove it, mirroring the Design tab's attribute overlay. */
export function ObjectListOverlay() {
  const objects = useModeler(s => s.objects)
  const selectedId = useModeler(s => s.selectedId)
  const select = useModeler(s => s.select)
  const remove = useModeler(s => s.remove)
  if (!objects.length) return null

  return (
    <div className="stage-attrs">
      <h5>Objects <b>{objects.length}</b></h5>
      {objects.map(o => (
        <div key={o.id} className={`attr-row ${o.id === selectedId ? 'sel' : ''}`} onClick={() => select(o.id)}>
          <span>{o.name} <i className="attr-kind">{o.kind}</i></span>
          <button onClick={e => { e.stopPropagation(); remove(o.id) }} aria-label={`Remove ${o.name}`}>×</button>
        </div>
      ))}
    </div>
  )
}
