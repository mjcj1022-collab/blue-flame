import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'

/**
 * Real mesh design-for-manufacturing analysis over a triangle soup (the flat
 * [x,y,z,...] positions a baked sculpt mesh stores). Unlike the bounding-box
 * heuristic, this reads the actual geometry:
 *  - watertight / manifold: every edge shared by exactly two triangles
 *  - wall thickness: ray-cast inward from sampled facets to the opposite wall
 *  - overhangs: downward-facing area that needs print supports (45° rule)
 */

export type DfmLevel = 'pass' | 'warn' | 'fail'
export interface DfmIssue { level: DfmLevel; title: string; detail: string }

export interface DfmReport {
  triangles: number
  watertight: boolean
  boundaryEdges: number
  nonManifoldEdges: number
  minWall: number          // mm, smallest sampled wall thickness (Infinity if unmeasured)
  thinFraction: number     // fraction of samples below the wall minimum
  overhangFraction: number // fraction of surface area needing support (build up = +Y)
  issues: DfmIssue[]
}

const OVERHANG_COS = Math.cos(Math.PI / 4)   // 45° rule: normal within 45° of straight-down

/** Weld coincident vertices by rounded position and report open / non-manifold edges. */
function edgeAudit(v: number[]): { boundary: number; nonManifold: number } {
  const key = (i: number) => {
    const q = (x: number) => Math.round(x * 1e4) / 1e4
    return `${q(v[i])},${q(v[i + 1])},${q(v[i + 2])}`
  }
  const id = new Map<string, number>()
  const idx: number[] = []
  for (let i = 0; i < v.length; i += 3) {
    const k = key(i)
    let n = id.get(k)
    if (n === undefined) { n = id.size; id.set(k, n) }
    idx.push(n)
  }
  const edges = new Map<string, number>()
  const add = (a: number, b: number) => {
    const e = a < b ? `${a}_${b}` : `${b}_${a}`
    edges.set(e, (edges.get(e) ?? 0) + 1)
  }
  for (let t = 0; t < idx.length; t += 3) { add(idx[t], idx[t + 1]); add(idx[t + 1], idx[t + 2]); add(idx[t + 2], idx[t]) }
  let boundary = 0, nonManifold = 0
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++ }
  return { boundary, nonManifold }
}

export function analyzeMesh(vertices: number[], minWall = 0.8, maxSamples = 400): DfmReport {
  const triangles = Math.floor(vertices.length / 9)
  if (triangles === 0) {
    return { triangles: 0, watertight: false, boundaryEdges: 0, nonManifoldEdges: 0, minWall: Infinity, thinFraction: 0, overhangFraction: 0, issues: [{ level: 'fail', title: 'Empty mesh', detail: 'Nothing to analyze.' }] }
  }

  const { boundary, nonManifold } = edgeAudit(vertices)
  const watertight = boundary === 0 && nonManifold === 0
  const closed = boundary === 0   // no holes — enough to ray-cast walls, even if some edges are non-manifold

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(vertices), 3))
  geo.computeVertexNormals()
  const bvh = closed ? new MeshBVH(geo) : null   // wall raycasts need a closed surface (no open holes)

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const centroid = new THREE.Vector3(), normal = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
  const ray = new THREE.Ray()
  const stride = Math.max(1, Math.floor(triangles / maxSamples))

  const wallHits: number[] = []
  let overhangArea = 0, totalArea = 0

  for (let t = 0; t < triangles; t += 1) {
    const o = t * 9
    a.set(vertices[o], vertices[o + 1], vertices[o + 2])
    b.set(vertices[o + 3], vertices[o + 4], vertices[o + 5])
    c.set(vertices[o + 6], vertices[o + 7], vertices[o + 8])
    e1.subVectors(b, a); e2.subVectors(c, a)
    normal.crossVectors(e1, e2)
    const area = normal.length() * 0.5
    totalArea += area
    if (area > 1e-9) {
      normal.normalize()
      if (normal.y < -OVERHANG_COS) overhangArea += area   // downward-facing → needs support
    }

    if (!bvh || t % stride !== 0 || area <= 1e-9) continue
    // ray-cast inward from the facet centroid to the opposite wall
    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3)
    const dir = normal.clone().negate()
    ray.origin.copy(centroid).addScaledVector(dir, 1e-3)
    ray.direction.copy(dir)
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide)
    if (hit && hit.distance > 1e-3) wallHits.push(hit.distance + 1e-3)
  }

  geo.dispose()

  // Robust min wall: a low percentile, so a stray degenerate hit can't fake a
  // failure. Infinity when we couldn't (or shouldn't) measure.
  wallHits.sort((x, y) => x - y)
  const minWallSeen = wallHits.length ? wallHits[Math.min(Math.floor(wallHits.length * 0.05), wallHits.length - 1)] : Infinity
  const thinFraction = wallHits.length ? wallHits.filter(w => w < minWall).length / wallHits.length : 0
  const overhangFraction = totalArea ? overhangArea / totalArea : 0

  const issues: DfmIssue[] = []
  if (watertight) {
    issues.push({ level: 'pass', title: 'Watertight', detail: 'Closed manifold surface — slices and casts cleanly.' })
  } else if (boundary > 0) {
    issues.push({ level: 'fail', title: 'Open surface', detail: `${boundary} open edge${boundary === 1 ? '' : 's'} — holes in the surface. Fuse or close the mesh before printing.` })
  } else {
    issues.push({ level: 'warn', title: 'Non-manifold edges', detail: `Closed, but ${nonManifold} edge${nonManifold === 1 ? '' : 's'} are shared by more than two faces (coplanar/overlap from booleans). Slices in most cases; run a mesh clean for a flawless print.` })
  }

  if (minWallSeen !== Infinity) {
    issues.push(minWallSeen < minWall
      ? { level: 'fail', title: 'Wall too thin', detail: `Thinnest wall ${minWallSeen.toFixed(2)} mm is below the ${minWall.toFixed(2)} mm minimum${thinFraction > 0.05 ? ` (${Math.round(thinFraction * 100)}% of samples thin)` : ''}. It will cast porous or snap.` }
      : minWallSeen < minWall * 1.4
        ? { level: 'warn', title: 'Thin in places', detail: `Thinnest wall ${minWallSeen.toFixed(2)} mm is castable but leaves little margin.` }
        : { level: 'pass', title: 'Wall thickness OK', detail: `Thinnest sampled wall ${minWallSeen.toFixed(2)} mm clears the ${minWall.toFixed(2)} mm minimum.` })
  } else if (!closed) {
    issues.push({ level: 'warn', title: 'Wall check needs a closed surface', detail: 'Close the open edges (Fuse metal), then re-analyze to measure wall thickness.' })
  }

  issues.push(overhangFraction > 0.25
    ? { level: 'warn', title: 'Heavy overhangs', detail: `${Math.round(overhangFraction * 100)}% of the surface faces downward past 45° and needs supports when printed (build axis = up).` }
    : { level: 'pass', title: 'Overhangs OK', detail: `${Math.round(overhangFraction * 100)}% overhanging — minimal supports needed.` })

  return { triangles, watertight, boundaryEdges: boundary, nonManifoldEdges: nonManifold, minWall: minWallSeen, thinFraction, overhangFraction, issues }
}
