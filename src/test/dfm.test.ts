import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { analyzeMesh } from '../lib/dfm'

const soup = (g: THREE.BufferGeometry): number[] =>
  Array.from((g.toNonIndexed().getAttribute('position').array as Float32Array))

describe('analyzeMesh', () => {
  it('reports a solid box as watertight with a thick wall', () => {
    const r = analyzeMesh(soup(new THREE.BoxGeometry(6, 6, 6)))
    expect(r.watertight).toBe(true)
    expect(r.boundaryEdges).toBe(0)
    expect(r.nonManifoldEdges).toBe(0)
    // opposite wall is 6 mm away
    expect(r.minWall).toBeGreaterThan(5.5)
    expect(r.minWall).toBeLessThan(6.5)
    expect(r.issues.some(i => i.level === 'fail')).toBe(false)
  })

  it('flags a thin plate as a wall failure', () => {
    const r = analyzeMesh(soup(new THREE.BoxGeometry(6, 0.3, 6)))
    expect(r.minWall).toBeLessThan(0.8)
    expect(r.issues.some(i => i.level === 'fail' && /wall/i.test(i.title))).toBe(true)
  })

  it('flags an open surface as not watertight', () => {
    const r = analyzeMesh(soup(new THREE.PlaneGeometry(6, 6)))
    expect(r.watertight).toBe(false)
    expect(r.boundaryEdges).toBeGreaterThan(0)
  })

  it('measures downward overhang area (a box has ~1/6 facing down)', () => {
    const r = analyzeMesh(soup(new THREE.BoxGeometry(6, 6, 6)))
    expect(r.overhangFraction).toBeGreaterThan(0.1)
    expect(r.overhangFraction).toBeLessThan(0.25)
  })
})
