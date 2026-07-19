import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import type { SculptObject, PrimitiveKind } from '../state/modeler'

export type BooleanOp = 'union' | 'subtract' | 'intersect'

const OP = { union: ADDITION, subtract: SUBTRACTION, intersect: INTERSECTION } as const

/** Geometry for a primitive at a base size (unit-ish, then transformed by scale). */
export function primitiveGeometry(kind: PrimitiveKind, size: number): THREE.BufferGeometry {
  const r = size / 2
  switch (kind) {
    case 'box': return new THREE.BoxGeometry(size, size, size)
    case 'sphere': return new THREE.SphereGeometry(r, 40, 28)
    case 'cylinder': return new THREE.CylinderGeometry(r, r, size, 40)
    case 'cone': return new THREE.ConeGeometry(r, size, 40)
    case 'torus': return new THREE.TorusGeometry(r, size / 4, 24, 64)
    case 'tube': return new THREE.TorusGeometry(r, size / 10, 18, 72)
  }
}

/** Geometry from baked boolean-result vertices. */
function geomFromVertices(vertices: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  g.computeVertexNormals()
  return g
}

export function objectMatrix(o: SculptObject): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...o.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...o.rotation)),
    new THREE.Vector3(...o.scale)
  )
}

/** Object geometry in world space (transform baked in). */
export function bakedGeometry(o: SculptObject): THREE.BufferGeometry {
  const g = o.kind === 'mesh' && o.vertices ? geomFromVertices(o.vertices) : primitiveGeometry(o.kind as PrimitiveKind, o.size)
  g.applyMatrix4(objectMatrix(o))
  return g
}

/**
 * Boolean of two objects. Returns the world-space result geometry vertices,
 * ready to store as a new 'mesh' object with an identity transform.
 */
export function booleanOp(a: SculptObject, b: SculptObject, op: BooleanOp): number[] {
  const brushA = new Brush(bakedGeometry(a))
  brushA.updateMatrixWorld()
  const brushB = new Brush(bakedGeometry(b))
  brushB.updateMatrixWorld()
  const evaluator = new Evaluator()
  evaluator.useGroups = false
  const result = evaluator.evaluate(brushA, brushB, OP[op])
  const pos = result.geometry.getAttribute('position')
  return Array.from(pos.array as Float32Array)
}

export function renderGeometry(o: SculptObject): THREE.BufferGeometry {
  return o.kind === 'mesh' && o.vertices ? geomFromVertices(o.vertices) : primitiveGeometry(o.kind as PrimitiveKind, o.size)
}

/** Merge every object into one watertight-ish mesh and emit ASCII STL. */
export function modelerToStl(objects: SculptObject[]): string {
  const group = new THREE.Group()
  for (const o of objects) {
    group.add(new THREE.Mesh(bakedGeometry(o)))
  }
  const stl = new STLExporter().parse(group, { binary: false })
  group.traverse(n => { const g = (n as THREE.Mesh).geometry; if (g) g.dispose() })
  return stl
}
