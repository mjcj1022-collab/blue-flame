import { useEffect, useState, useCallback } from 'react'
import { useDesign } from '../state/design'
import { useAuth } from '../state/auth'
import { useWorkspace } from '../state/workspace'
import { gallery, type GalleryItem } from '../lib/gallery'
import { heroImage, canCapture } from '../viewer/capture'

/**
 * The active gallery — the first window shown on launch. Everyone in the shop
 * sees the same curated showcase; admins alone can add the current design or
 * remove pieces. Clicking a piece opens a lightbox with prev/next paging, and
 * "Open in editor" loads that exact design onto the workbench.
 */
export function GalleryModal({ onClose }: { onClose: () => void }) {
  const isAdmin = useAuth(s => s.role === 'admin')
  const spec = useDesign(s => s.spec)
  const load = useDesign(s => s.load)
  const setMode = useWorkspace(s => s.setMode)

  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)   // index into items
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [thumb, setThumb] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await gallery.list()) }
    catch { setError('Couldn’t load the gallery — the server may be waking up.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  // Esc closes the top-most layer (lightbox first, then the modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (lightbox != null) setLightbox(null); else if (!adding) onClose() }
      else if (lightbox != null && e.key === 'ArrowRight') setLightbox(i => (i == null ? i : (i + 1) % items.length))
      else if (lightbox != null && e.key === 'ArrowLeft') setLightbox(i => (i == null ? i : (i - 1 + items.length) % items.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, items.length, adding, onClose])

  const beginAdd = () => {
    const img = canCapture() ? heroImage(0.6, 'image/jpeg', 0.82) : null
    if (!img) { setError('Switch to the Design view first, then add — the live 3D piece is captured as the gallery image.'); return }
    setThumb(img.url); setTitle(''); setSubtitle(''); setAdding(true); setError(null)
  }

  const saveAdd = async () => {
    if (!thumb || !title.trim()) return
    setBusy(true); setError(null)
    try {
      await gallery.add({ title: title.trim(), subtitle: subtitle.trim() || undefined, image: thumb, spec })
      setAdding(false); setThumb(null)
      await refresh()
    } catch { setError('Couldn’t save — only admins can add, and the server must be reachable.') }
    finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try { await gallery.remove(id); setLightbox(null); await refresh() }
    catch { setError('Couldn’t remove that piece.') }
    finally { setBusy(false) }
  }

  const open = (it: GalleryItem) => {
    if (!it.spec) return
    load(it.spec)
    setMode('design')
    onClose()
  }

  const active = lightbox != null ? items[lightbox] : null

  return (
    <div className="lab-overlay gal-overlay" onClick={onClose}>
      <div className="gal" onClick={e => e.stopPropagation()}>
        <div className="gal-head">
          <div>
            <h2>Gallery</h2>
            <p>{gallery.backed() ? 'Your shop’s featured designs' : 'Featured designs'}{isAdmin ? ' · you can curate this' : ''}</p>
          </div>
          <div className="gal-head-acts">
            {isAdmin && !adding && <button className="primary" onClick={beginAdd}>＋ Add current design</button>}
            <button className="lab-x" onClick={onClose} aria-label="Close gallery">×</button>
          </div>
        </div>

        {error && <div className="gal-error">{error}</div>}

        {adding && thumb && (
          <div className="gal-addform">
            <img src={thumb} alt="New gallery piece preview" className="gal-addthumb" />
            <div className="gal-addfields">
              <label><span>Title</span><input value={title} autoFocus onChange={e => setTitle(e.target.value)} placeholder="e.g. Six-prong solitaire" maxLength={80} /></label>
              <label><span>Subtitle (optional)</span><input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="e.g. 1.5 ct · 14K white" maxLength={120} /></label>
              <div className="gal-addbtns">
                <button className="ghost" onClick={() => { setAdding(false); setThumb(null) }} disabled={busy}>Cancel</button>
                <button className="primary" onClick={saveAdd} disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Add to gallery'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="gal-body">
          {loading ? (
            <div className="gal-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="gal-empty">
              No featured designs yet.{isAdmin ? ' Use “Add current design” to feature the piece on your workbench.' : ' Check back soon.'}
            </div>
          ) : (
            <div className="gal-grid">
              {items.map((it, i) => (
                <figure key={it.id} className="gal-card" onClick={() => setLightbox(i)}>
                  <img src={it.image} alt={it.title} loading="lazy" />
                  <figcaption>
                    <b>{it.title}</b>
                    {it.subtitle && <span>{it.subtitle}</span>}
                  </figcaption>
                  {it.spec && <span className="gal-openable" title="Editable design">◆</span>}
                </figure>
              ))}
            </div>
          )}
        </div>

        <div className="gal-foot">
          <button className="ghost" onClick={onClose}>{items.length ? 'Enter workbench' : 'Continue'}</button>
        </div>
      </div>

      {active && (
        <div className="gal-lb" onClick={() => setLightbox(null)}>
          <button className="gal-lb-x" onClick={() => setLightbox(null)} aria-label="Close">×</button>
          {items.length > 1 && (
            <button className="gal-lb-nav prev" onClick={e => { e.stopPropagation(); setLightbox((lightbox! - 1 + items.length) % items.length) }} aria-label="Previous">‹</button>
          )}
          <figure className="gal-lb-fig" onClick={e => e.stopPropagation()}>
            <img src={active.image} alt={active.title} />
            <figcaption>
              <div>
                <b>{active.title}</b>
                {active.subtitle && <span>{active.subtitle}</span>}
              </div>
              <div className="gal-lb-acts">
                <span className="gal-lb-count">{lightbox! + 1} / {items.length}</span>
                {active.spec && <button className="primary" onClick={() => open(active)}>Open in editor</button>}
                {isAdmin && <button className="ghost" onClick={() => remove(active.id)} disabled={busy}>Delete</button>}
              </div>
            </figcaption>
          </figure>
          {items.length > 1 && (
            <button className="gal-lb-nav next" onClick={e => { e.stopPropagation(); setLightbox((lightbox! + 1) % items.length) }} aria-label="Next">›</button>
          )}
        </div>
      )}
    </div>
  )
}
