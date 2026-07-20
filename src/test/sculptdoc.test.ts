import { describe, it, expect } from 'vitest'
import { sculptTechSheet } from '../lib/sculptDoc'
import type { SculptObject } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: 'x', name: 'Part', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over
})

describe('sculptTechSheet', () => {
  const scene: SculptObject[] = [
    obj({ kind: 'shank', name: 'Ring band', params: { ringSize: 7 } }),
    obj({ kind: 'gem', name: 'Centre stone', material: 'gem', params: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 } })
  ]

  it('lists a bill of materials, metal, and the estimate', () => {
    const doc = sculptTechSheet(scene, '14ky', 'Test Shop')
    expect(doc).toContain('TEST SHOP')
    expect(doc).toContain('PARTS  2 total')
    expect(doc).toContain('Ring band')
    expect(doc).toContain('Centre stone')
    expect(doc).toContain('Diamond')
    expect(doc).toMatch(/METAL/)
    expect(doc).toMatch(/ESTIMATE/)
    expect(doc).toMatch(/\$[\d,]/)          // at least one money figure
    expect(doc).toContain('1.00 ct')
  })

  it('omits stone lines when there are no gems', () => {
    const doc = sculptTechSheet([obj({ kind: 'box' })], '14ky')
    expect(doc).toContain('PARTS  1 total')
    expect(doc).not.toContain('Gemstones')
    expect(doc).toContain('ESTIMATE')
  })
})
