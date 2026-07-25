import * as THREE from 'three'
import { seededSeeds, voronoiCells, insetPolygon, polygonArea } from './voronoi'

/**
 * Build a pierced Voronoi-lattice panel as a triangle soup (flat [x,y,z,...],
 * the format sculpt mesh objects store). The panel is a rectangle with one hole
 * per Voronoi cell (each cell inset by half the strut width so metal webbing
 * remains between the holes), extruded to `thickness` and laid flat (thickness
 * along +Y). Deterministic from `seed`. Reuses THREE's ExtrudeGeometry for the
 * hole triangulation, so the result is a proper closed solid ready to print.
 */

export interface LatticeOpts {
  width: number      // mm
  height: number     // mm
  thickness: number  // mm
  count: number      // approximate number of cells
  strut: number      // mm of metal left between cells
  seed: number
  jitter?: number
}

export function voronoiLatticeVertices(opts: LatticeOpts): number[] {
  const { width: w, height: h, thickness: th, count, strut, seed, jitter = 0.7 } = opts
  const seeds = seededSeeds({ width: w, height: h, count, seed, jitter })
  const cells = voronoiCells(seeds, w, h)

  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, -h / 2)
  shape.lineTo(w / 2, -h / 2)
  shape.lineTo(w / 2, h / 2)
  shape.lineTo(-w / 2, h / 2)
  shape.closePath()

  const minHole = strut * strut * 0.6   // drop slivers too small to pierce cleanly
  for (const cell of cells) {
    const inset = insetPolygon(cell, strut / 2)
    if (inset.length < 3 || polygonArea(inset) < minHole) continue
    // holes must wind opposite the outer contour → reverse (cells are CCW)
    const path = new THREE.Path()
    const pts = inset.slice().reverse()
    pts.forEach((p, i) => {
      const x = p[0] - w / 2, y = p[1] - h / 2
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y)
    })
    path.closePath()
    shape.holes.push(path)
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, steps: 1 })
  geo.translate(0, 0, -th / 2)   // center the thickness on 0
  geo.rotateX(-Math.PI / 2)      // lie flat: panel in XZ, thickness along Y

  const ni = geo.index ? geo.toNonIndexed() : geo
  const pos = ni.getAttribute('position') as THREE.BufferAttribute
  const out: number[] = []
  for (let i = 0; i < pos.count; i++) out.push(pos.getX(i), pos.getY(i), pos.getZ(i))
  ni.dispose()
  if (ni !== geo) geo.dispose()
  return out
}

/** How many holes a given config will actually pierce (for the UI count read-out). */
export function latticeHoleCount(opts: LatticeOpts): number {
  const seeds = seededSeeds({ width: opts.width, height: opts.height, count: opts.count, seed: opts.seed, jitter: opts.jitter ?? 0.7 })
  const cells = voronoiCells(seeds, opts.width, opts.height)
  const minHole = opts.strut * opts.strut * 0.6
  let n = 0
  for (const cell of cells) {
    const inset = insetPolygon(cell, opts.strut / 2)
    if (inset.length >= 3 && polygonArea(inset) >= minHole) n++
  }
  return n
}
