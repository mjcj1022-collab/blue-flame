import { useRef, useState } from 'react'
import { useModeler, SCULPT_COLORS } from '../state/modeler'
import { sketchToVertices, type SketchMode } from '../lib/sculpt'

/** Drawing surface size (px) and the mm each pixel represents. */
const W = 280, H = 320, MM_PER_PX = 0.11
const AXIS_X = 46            // revolve spin-axis, in px from the left edge

type Pt = { x: number; y: number }   // px, SVG space (y down)

/** Decimate a freehand stroke so the generated mesh stays clean. */
function simplify(pts: Pt[], minDist = 6): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minDist) out.push(p)
  }
  return out
}

export function SketchPad({ onClose }: { onClose: () => void }) {
  const addMesh = useModeler(s => s.addMesh)
  const [mode, setMode] = useState<SketchMode>('revolve')
  const [depth, setDepth] = useState(3)
  const [pts, setPts] = useState<Pt[]>([])
  const drawing = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const toSvg = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const down = (e: React.PointerEvent) => { drawing.current = true; setPts([toSvg(e)]); svgRef.current?.setPointerCapture(e.pointerId) }
  const move = (e: React.PointerEvent) => { if (drawing.current) setPts(p => [...p, toSvg(e)]) }
  const up = () => { drawing.current = false; setPts(p => simplify(p)) }

  // px → mm. Revolve: x = radius from the axis (clamped ≥0), y = height (up = +).
  // Extrude: outline in a centred XY plane.
  const toMm = (): [number, number][] => {
    if (mode === 'revolve') {
      return pts.map(p => [Math.max(0, (p.x - AXIS_X) * MM_PER_PX), (H - p.y) * MM_PER_PX])
    }
    return pts.map(p => [(p.x - W / 2) * MM_PER_PX, (H / 2 - p.y) * MM_PER_PX])
  }

  const path = pts.length ? 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') : ''
  const canAdd = pts.length >= 3

  const add = () => {
    const verts = sketchToVertices(toMm(), mode, depth)
    if (verts.length < 9) return
    addMesh({
      kind: 'mesh', vertices: verts, size: 0,
      position: [0, mode === 'extrude' ? 6 : 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      material: 'metal', color: SCULPT_COLORS.metal, name: mode === 'revolve' ? 'Revolve' : 'Extrude'
    })
    onClose()
  }

  return (
    <div className="lab-overlay" onClick={onClose}>
      <div className="lab sketch" style={{ width: 'min(680px,96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="lab-head">
          <div>
            <h2>Free draw</h2>
            <p>Sketch a profile, then revolve or extrude it into a solid you can vertex-edit.</p>
          </div>
          <button className="lab-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="sketch-body">
          <div className="sketch-canvas">
            <svg
              ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="sketch-svg"
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
            >
              {[...Array(Math.floor(W / 20) + 1)].map((_, i) => <line key={'v' + i} x1={i * 20} y1={0} x2={i * 20} y2={H} className="sk-grid" />)}
              {[...Array(Math.floor(H / 20) + 1)].map((_, i) => <line key={'h' + i} x1={0} y1={i * 20} x2={W} y2={i * 20} className="sk-grid" />)}
              {mode === 'revolve' && <line x1={AXIS_X} y1={0} x2={AXIS_X} y2={H} className="sk-axis" />}
              {mode === 'extrude' && <line x1={W / 2} y1={0} x2={W / 2} y2={H} className="sk-axis dim" />}
              {path && <path d={mode === 'extrude' && !drawing.current && canAdd ? path + ' Z' : path} className="sk-path" />}
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1.6} className="sk-dot" />)}
            </svg>
          </div>

          <div className="sketch-side">
            <h4>Shape</h4>
            <div className="opts c2">
              <button className="opt" aria-pressed={mode === 'revolve'} onClick={() => setMode('revolve')}>Revolve</button>
              <button className="opt" aria-pressed={mode === 'extrude'} onClick={() => setMode('extrude')}>Extrude</button>
            </div>
            <p className="disc">
              {mode === 'revolve'
                ? 'The gold line is the spin axis. Draw the outline to its right — it revolves 360° into a band, bezel or bead.'
                : 'Draw a closed outline (a charm, initial or plaque). It’s auto-closed and pushed out to the depth below.'}
            </p>

            {mode === 'extrude' && (
              <>
                <div className="row" style={{ marginTop: 12 }}><label>Depth</label><span className="val">{depth.toFixed(1)} mm</span></div>
                <input type="range" min={0.6} max={12} step={0.2} value={depth} onChange={e => setDepth(+e.target.value)} />
              </>
            )}

            <div className="row" style={{ marginTop: 14 }}><label>Points</label><span className="val">{pts.length}</span></div>

            <div className="opts c2" style={{ marginTop: 12 }}>
              <button className="opt" onClick={() => setPts([])}>Clear</button>
              <button className="opt primary" disabled={!canAdd} onClick={add}>Add to workspace</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
