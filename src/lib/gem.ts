import * as THREE from 'three'

/**
 * A faceted round-brilliant solid — girdle diameter = `width` (mm). A flat
 * table, a zig-zag crown (bezel/star facets), a thin girdle and pavilion mains
 * converging to the culet. Built non-indexed so every facet gets its own flat
 * normal and catches light like a real cut stone. `sides` (the shape's facet
 * count) sets the outline: 16 → round, 8 → cushion, 4 → princess, 3 → trillion.
 */
export function brilliantGeometry(width: number, sides = 16): THREE.BufferGeometry {
  const r = width / 2
  const tableR = r * 0.53
  const crownH = width * 0.16
  const girdleH = width * 0.03
  const pavH = width * 0.43
  const yT = crownH, yG1 = girdleH / 2, yG2 = -girdleH / 2, yC = -pavH
  const N = Math.max(3, Math.round(sides))
  const TAU = Math.PI * 2
  const half = Math.PI / N

  const pos: number[] = []
  const push = (a: number[], b: number[], c: number[]) => pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
  const at = (rad: number, y: number, ang: number): number[] => [Math.cos(ang) * rad, y, Math.sin(ang) * rad]

  const tableC = [0, yT, 0], culet = [0, yC, 0]
  const tableRing = (i: number) => at(tableR, yT, (i / N) * TAU)
  const gTop = (i: number) => at(r, yG1, (i / N) * TAU + half)   // girdle offset half a facet
  const gBot = (i: number) => at(r, yG2, (i / N) * TAU + half)

  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    const p = (i - 1 + N) % N
    push(tableC, tableRing(j), tableRing(i))                      // table
    push(tableRing(i), gTop(p), gTop(i))                         // crown bezel (down)
    push(tableRing(i), gTop(i), tableRing(j))                    // crown star (up)
    push(gTop(i), gBot(i), gBot(j))                              // girdle
    push(gTop(i), gBot(j), gTop(j))
    push(gBot(i), gBot(j), culet)                                // pavilion main
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}
