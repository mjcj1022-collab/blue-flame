import { useState, useEffect } from 'react'
import { useDesign } from '../state/design'
import { Library, browserKV, type SavedDesign } from '../lib/library'
import { CATEGORY_LABEL, type DesignSpec } from '../spec/types'
import { computePrice } from '../lib/pricing'
import { money } from '../lib/units'
import { api, apiConfigured } from '../lib/api'

const library = new Library(browserKV)

/** Backend-backed library when VITE_API_URL is set; otherwise the local one. */
export function LibraryPanel() {
  return apiConfigured() ? <CloudLibrary /> : <LocalLibrary />
}

interface CloudItem { id: string; name: string; updated_at: string }

function CloudLibrary() {
  const spec = useDesign(s => s.spec)
  const load = useDesign(s => s.load)
  const [items, setItems] = useState<CloudItem[]>([])
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const refresh = () => { api.listDesigns().then(r => setItems(r as CloudItem[])).catch(() => flash('Sign in to sync.')) }
  useEffect(refresh, [])

  const save = () => {
    api.saveDesign(name.trim() || defaultName(spec), spec).then(() => { setName(''); refresh(); flash('Saved to cloud.') }).catch(e => flash((e as Error).message))
  }
  const open = (id: string) => { api.loadDesign(id).then(r => load((r as { spec: DesignSpec }).spec)).catch(e => flash((e as Error).message)) }
  const remove = (id: string) => { api.deleteDesign(id).then(refresh).catch(e => flash((e as Error).message)) }

  return (
    <div className="panel-block library">
      <h4>My designs <span className="mfg-sum"><b className="ok">cloud</b></span></h4>
      <div className="lib-save">
        <input className="lib-name" placeholder={defaultName(spec)} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }} />
        <button className="primary" onClick={save}>Save</button>
      </div>
      {items.length === 0 && <p className="disc">Nothing saved yet, or not signed in. Designs sync to your shop across devices.</p>}
      {items.map(d => (
        <div key={d.id} className="lib-item">
          <div className="lib-row">
            <div className="lib-meta"><b>{d.name}</b><small>{new Date(d.updated_at + 'Z').toLocaleDateString()}</small></div>
            <div className="lib-acts">
              <button className="mini" onClick={() => open(d.id)}>Load</button>
              <button className="mini danger" onClick={() => remove(d.id)}>×</button>
            </div>
          </div>
        </div>
      ))}
      {msg && <p className="disc">{msg}</p>}
    </div>
  )
}

function defaultName(spec: DesignSpec): string {
  const label = CATEGORY_LABEL[spec.category]
  const ct = spec.center.carat
  return spec.center.stoneTypeId === 'none' ? label : `${ct.toFixed(2)} ct ${label}`
}

const when = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function LocalLibrary() {
  const spec = useDesign(s => s.spec)
  const load = useDesign(s => s.load)
  const [items, setItems] = useState<SavedDesign[]>(() => library.list())
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const refresh = () => setItems(library.list())

  const save = () => { library.save(name.trim() || defaultName(spec), spec); setName(''); refresh() }
  const overwrite = (id: string) => { library.update(id, spec); refresh() }
  const fork = (id: string) => { library.fork(id); refresh() }
  const remove = (id: string) => { library.remove(id); if (openId === id) setOpenId(null); refresh() }
  const rollback = (id: string, at: number) => { const d = library.rollback(id, at); if (d) load(d.spec); refresh() }

  return (
    <div className="panel-block library">
      <h4>My designs</h4>

      <div className="lib-save">
        <input
          className="lib-name"
          placeholder={defaultName(spec)}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save() }}
        />
        <button className="primary" onClick={save}>Save</button>
      </div>

      {items.length === 0 && <p className="disc">Nothing saved yet. Save the current design to build a library, then fork or roll back any version.</p>}

      {items.map(d => {
        const p = computePrice(d.spec)
        return (
          <div key={d.id} className="lib-item">
            <div className="lib-row">
              <div className="lib-meta">
                <b>{d.name}</b>
                <small>{CATEGORY_LABEL[d.spec.category]} · {money(p.total)} · {when(d.updatedAt)}{d.parentId ? ' · forked' : ''}</small>
              </div>
              <div className="lib-acts">
                <button className="mini" onClick={() => load(d.spec)}>Load</button>
                <button className="mini" onClick={() => overwrite(d.id)} title="Save current design over this one, keeping a version">Update</button>
                <button className="mini" onClick={() => fork(d.id)}>Fork</button>
                {d.versions.length > 0 && (
                  <button className="mini" aria-pressed={openId === d.id} onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                    v{d.versions.length}
                  </button>
                )}
                <button className="mini danger" onClick={() => remove(d.id)} title="Delete">×</button>
              </div>
            </div>
            {openId === d.id && (
              <div className="lib-versions">
                {[...d.versions].reverse().map(v => (
                  <div key={v.at} className="lib-ver">
                    <span>{when(v.at)} · {money(computePrice(v.spec).total)}{v.note ? ` · ${v.note}` : ''}</span>
                    <button className="mini" onClick={() => rollback(d.id, v.at)}>Roll back</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
