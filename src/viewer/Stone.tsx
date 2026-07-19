import { useMemo } from 'react'
import * as THREE from 'three'
import { shapeById, stoneById, stoneMm } from '../catalog'

interface Props { shapeId: string; stoneTypeId: string; carat: number }

/**
 * Round-brilliant proportions driven by girdle diameter. Elongated shapes are
 * the same solid scaled along Z by the length-to-width ratio.
 */
export function Stone({ shapeId, stoneTypeId, carat }: Props) {
  const shape = shapeById(shapeId)
  const stone = stoneById(stoneTypeId)
  const { width } = stoneMm(shape, carat)

  const dims = useMemo(() => {
    const r = width / 2
    return { r, crownH: width * 0.16, pavH: width * 0.43, girdleH: width * 0.03, tableR: r * 0.55 }
  }, [width])

  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: stone.color,
    metalness: 0,
    roughness: 0.02,
    transmission: stone.transparent ? 0.94 : 0.3,
    thickness: width * 0.5,
    ior: stone.ior,
    envMapIntensity: 2.8,
    clearcoat: 1,
    clearcoatRoughness: 0,
    transparent: true,
    opacity: stone.transparent ? 1 : 0.97
  }), [stone, width])

  const seg = shape.segments

  return (
    <group scale={[1, 1, shape.lwRatio]}>
      <mesh material={material} rotation={[Math.PI, 0, 0]} position={[0, -dims.pavH / 2 - dims.girdleH / 2, 0]}>
        <coneGeometry args={[dims.r, dims.pavH, seg, 1]} />
      </mesh>
      <mesh material={material}>
        <cylinderGeometry args={[dims.r, dims.r, dims.girdleH, seg, 1]} />
      </mesh>
      <mesh material={material} position={[0, dims.crownH / 2 + dims.girdleH / 2, 0]}>
        <cylinderGeometry args={[dims.tableR, dims.r, dims.crownH, seg, 1]} />
      </mesh>
    </group>
  )
}

export function stoneDims(shapeId: string, carat: number) {
  const shape = shapeById(shapeId)
  const { width } = stoneMm(shape, carat)
  return { width, r: width / 2, crownH: width * 0.16, pavH: width * 0.43, girdleH: width * 0.03, lwRatio: shape.lwRatio }
}
