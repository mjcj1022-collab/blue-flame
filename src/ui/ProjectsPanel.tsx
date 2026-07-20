import { useState } from 'react'
import { useDesign } from '../state/design'
import { useModeler } from '../state/modeler'
import { projects, type Project } from '../lib/autosave'

/** Named snapshots bundling the current design AND sculpt into one project. */
export function ProjectsPanel() {
  const [name, setName] = useState('')
  const [list, setList] = useState<Project[]>(() => projects.list())
  const [msg, setMsg] = useState('')
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const save = () => {
    const spec = useDesign.getState().spec
    const sculpt = useModeler.getState().objects
    projects.save(name.trim() || `Project ${new Date().toLocaleDateString()}`, spec, sculpt)
    setName(''); setList(projects.list()); flash('Project saved.')
  }

  const open = (id: string) => {
    const p = projects.get(id)
    if (!p) return
    useDesign.getState().load(p.spec)
    useDesign.setState({ past: [], future: [] })
    useModeler.setState({ objects: p.sculpt, past: [], future: [], selectedId: null })
    flash(`Loaded “${p.name}”.`)
  }
  const remove = (id: string) => { projects.remove(id); setList(projects.list()) }

  return (
    <div className="panel-block library">
      <h4>Projects <span className="mfg-sum"><b className="ok">design + sculpt</b></span></h4>
      <div className="lib-save">
        <input className="lib-name" placeholder="Name this project" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }} />
        <button className="primary" onClick={save}>Save</button>
      </div>
      {list.length === 0 && <p className="disc">Save the whole studio — this design plus everything in Sculpt — as one named project.</p>}
      {list.map(p => (
        <div key={p.id} className="lib-item">
          <div className="lib-row">
            <div className="lib-meta"><b>{p.name}</b><small>{p.sculpt.length} sculpt part{p.sculpt.length === 1 ? '' : 's'} · {new Date(p.at).toLocaleDateString()}</small></div>
            <div className="lib-acts">
              <button className="mini" onClick={() => open(p.id)}>Load</button>
              <button className="mini danger" onClick={() => remove(p.id)}>×</button>
            </div>
          </div>
        </div>
      ))}
      {msg && <p className="disc">{msg}</p>}
    </div>
  )
}
