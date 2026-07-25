import * as THREE from 'three'

/**
 * Necklace rendered as a real interlocking chain around the neckline loop (a
 * circle in the XY view plane) instead of a smooth torus. Links are placed along
 * the circle, each oriented to the local tangent with alternating 90° twist so
 * consecutive links thread through one another. Several classic chain styles vary
 * the link size, spacing and shape. Returns a triangle soup (flat [x,y,z,...]).
 */

export type NecklaceStyle = 'cable' | 'curb' | 'rope' | 'figaro' | 'bead'

export const NECKLACE_STYLES: [NecklaceStyle, string][] = [
  ['cable', 'Cable'], ['curb', 'Curb'], ['rope', 'Rope'], ['figaro', 'Figaro'], ['bead', 'Bead / ball'],
]

interface StyleSpec { link: number; spacing: number; minorK: number; oval: number }
// link = link major radius ÷ wire; spacing = centre-to-centre ÷ link; minorK = wire scale; oval = long-axis stretch
const STYLE: Record<NecklaceStyle, StyleSpec> = {
  cable:  { link: 2.1, spacing: 1.05, minorK: 1.0, oval: 1.0 },
  curb:   { link: 2.4, spacing: 0.82, minorK: 1.15, oval: 1.15 },
  rope:   { link: 1.5, spacing: 0.72, minorK: 0.9, oval: 1.0 },
  figaro: { link: 2.1, spacing: 1.0, minorK: 1.0, oval: 1.0 },   // long link every 4th (handled below)
  bead:   { link: 1.7, spacing: 1.25, minorK: 1.0, oval: 1.0 },
}

function pushGeo(out: number[], g: THREE.BufferGeometry, m: THREE.Matrix4) {
  g.applyMatrix4(m)
  const ni = g.index ? g.toNonIndexed() : g
  const pos = ni.getAttribute('position') as THREE.BufferAttribute
  for (let k = 0; k < pos.count; k++) out.push(pos.getX(k), pos.getY(k), pos.getZ(k))
  ni.dispose()
  if (ni !== g) g.dispose()
}

export function necklaceChainVertices(R: number, wireR: number, style: NecklaceStyle = 'cable'): number[] {
  const s = STYLE[style]
  const wire = Math.max(0.25, wireR) * s.minorK
  const linkR = wire * s.link
  const step = linkR * 2 * s.spacing            // centre-to-centre arc length
  const N = Math.max(16, Math.round((2 * Math.PI * R) / step))
  const out: number[] = []

  const P = new THREE.Vector3(), T = new THREE.Vector3(), Nz = new THREE.Vector3(0, 0, 1), Rd = new THREE.Vector3()

  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2
    const c = Math.cos(th), sn = Math.sin(th)
    P.set(c * R, sn * R, 0)
    T.set(-sn, c, 0)          // tangent (chain direction)
    Rd.set(c, sn, 0)          // radial

    const m = new THREE.Matrix4()
    // even links stand perpendicular to the necklace plane, odd links lie in it
    if (i % 2 === 0) m.makeBasis(T, Nz, Rd)
    else m.makeBasis(T, Rd, Nz)
    m.setPosition(P)

    let g: THREE.BufferGeometry
    if (style === 'bead') {
      g = new THREE.SphereGeometry(linkR * 0.72, 14, 12)
    } else {
      // figaro: every 4th link elongated
      const long = style === 'figaro' && i % 4 === 0 ? 1.8 : s.oval
      g = new THREE.TorusGeometry(linkR, wire, 8, 22)
      if (long !== 1) g.scale(long, 1, 1)   // stretch the long axis (along tangent)
    }
    pushGeo(out, g, m)
  }
  return out
}
