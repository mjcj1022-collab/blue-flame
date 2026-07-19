import { useDesign } from '../state/design'
import { ALLOYS, SHAPES, STONES, SETTINGS } from '../catalog'
import { sizeToDiameter, sizeToCircumference, formatSize, fitAdvice } from '../lib/sizing'
import { shapeById, stoneMm } from '../catalog'
import { guardrails } from '../lib/pricing'

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="grp"><h3>{title}</h3>{children}</div>
}

function Slider({ id, label, value, min, max, step, display, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number
  display: string; onChange: (v: number) => void
}) {
  return (
    <>
      <div className="row"><label htmlFor={id}>{label}</label><span className="val">{display}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} />
    </>
  )
}

export function Controls() {
  const { spec, setRing, setAlloy, setShape, setStone, setCarat, setSetting, setFit } = useDesign()
  const shape = shapeById(spec.center.shapeId)
  const mm = stoneMm(shape, spec.center.carat)
  const advice = fitAdvice(spec.ring.size, spec.ring.width, spec.ring.fit)
  const rails = guardrails(spec)

  return (
    <>
      <Group title="Ring size">
        <Slider id="s-size" label="US size" value={spec.ring.size} min={3} max={13} step={0.25}
          display={formatSize(spec.ring.size)} onChange={v => setRing({ size: v })} />
        <p className="hint">
          Inside diameter <b>{sizeToDiameter(spec.ring.size).toFixed(2)}</b> mm ·
          circumference <b>{sizeToCircumference(spec.ring.size).toFixed(2)}</b> mm
        </p>
        {advice.level !== 'none' && (
          <div className={`flag ${advice.level === 'warn' ? '' : 'note'}`}>
            <b>{advice.title}</b>{advice.body}
            {advice.suggested !== undefined && (
              <button className="inline-act" onClick={() => setRing({ size: advice.suggested! })}>
                Apply size {formatSize(advice.suggested)}
              </button>
            )}
          </div>
        )}
      </Group>

      <Group title="Band">
        <Slider id="s-width" label="Width" value={spec.ring.width} min={1.5} max={9} step={0.1}
          display={`${spec.ring.width.toFixed(1)} mm`} onChange={v => setRing({ width: v })} />
        <div style={{ height: 16 }} />
        <Slider id="s-thick" label="Thickness" value={spec.ring.thickness} min={1.1} max={2.8} step={0.1}
          display={`${spec.ring.thickness.toFixed(1)} mm`} onChange={v => setRing({ thickness: v })} />
        <div className="opts c2" style={{ marginTop: 16 }}>
          <button className="opt" aria-pressed={spec.ring.fit === 'standard'} onClick={() => setFit('standard')}>
            Standard fit<small>Flat interior</small>
          </button>
          <button className="opt" aria-pressed={spec.ring.fit === 'comfort'} onClick={() => setFit('comfort')}>
            Comfort fit<small>Domed interior</small>
          </button>
        </div>
      </Group>

      <Group title="Metal">
        <div className="opts">
          {ALLOYS.map(a => (
            <button key={a.id} className="opt" aria-pressed={spec.metal.alloyId === a.id} onClick={() => setAlloy(a.id)}>
              <span className="sw" style={{ background: hex(a.color) }} />
              {a.short}<small>{a.density} g/cm³</small>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Stone shape">
        <div className="opts">
          {SHAPES.map(s => (
            <button key={s.id} className="opt" aria-pressed={spec.center.shapeId === s.id} onClick={() => setShape(s.id)}>
              <span className="shp">
                <svg viewBox="0 0 24 24"><path d={s.icon} fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              </span>
              {s.name}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Stone type">
        <div className="opts c2">
          {STONES.map(s => (
            <button key={s.id} className="opt" aria-pressed={spec.center.stoneTypeId === s.id} onClick={() => setStone(s.id)}>
              {s.name}<small>{s.variety}</small>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Carat weight">
        <Slider id="s-ct" label="Center stone" value={spec.center.carat} min={0.25} max={5} step={0.05}
          display={`${spec.center.carat.toFixed(2)} ct`} onChange={setCarat} />
        <p className="hint">
          Measures <b>{mm.length.toFixed(2)} × {mm.width.toFixed(2)}</b> mm ·
          millimetre size is shape-dependent, not a single formula
        </p>
      </Group>

      <Group title="Setting">
        <div className="opts c2">
          {SETTINGS.map(s => (
            <button key={s.id} className="opt" aria-pressed={spec.setting.typeId === s.id} onClick={() => setSetting(s.id)}>
              {s.name}<small>{s.variety}</small>
            </button>
          ))}
        </div>
        {rails.map((g, i) => (
          <div key={i} className={`flag ${g.level === 'ok' ? 'ok' : g.level === 'note' ? 'note' : ''}`}>
            <b>{g.title}</b>{g.body}
          </div>
        ))}
      </Group>
    </>
  )
}
