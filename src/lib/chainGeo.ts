import * as THREE from 'three'

/**
 * Procedural interlocking chain as a triangle soup (flat [x,y,z,...]). Each link
 * is a torus; consecutive links sit a link-radius apart and alternate between
 * perpendicular planes so they thread through one another — a real chain, not
 * stacked rings. Runs straight along X centered on the origin; bend or wrap it
 * afterward with the vertex tools. Deterministic, THREE-based.
 */

export interface ChainOpts {
  links: number      // number of links
  radius: number     // link (torus major) radius, mm
  wire: number       // wire (tube) radius, mm
  segments?: number  // tessellation
}

export function chainVertices({ links, radius, wire, segments = 18 }: ChainOpts): number[] {
  const out: number[] = []
  const n = Math.max(1, Math.floor(links))
  const step = radius                 // overlap so neighbours interlock
  const tub = Math.max(8, Math.round(segments))
  const rad = Math.max(5, Math.round(segments * 0.6))
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(radius, wire, rad, tub)
    const rot = new THREE.Matrix4()
    if (i % 2 === 1) rot.makeRotationX(Math.PI / 2)   // alternate plane → threads through the neighbour
    const trans = new THREE.Matrix4().makeTranslation((i - (n - 1) / 2) * step, 0, 0)
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(trans, rot))
    const ni = g.index ? g.toNonIndexed() : g
    const pos = ni.getAttribute('position') as THREE.BufferAttribute
    for (let k = 0; k < pos.count; k++) out.push(pos.getX(k), pos.getY(k), pos.getZ(k))
    ni.dispose()
    if (ni !== g) g.dispose()
  }
  return out
}

/** Approximate straight-line span of the chain in mm (for the UI read-out). */
export function chainSpan({ links, radius, wire }: ChainOpts): number {
  return Math.max(1, Math.floor(links)) * radius + radius + 2 * wire
}
