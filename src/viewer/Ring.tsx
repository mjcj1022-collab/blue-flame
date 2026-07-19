import { useMemo } from 'react'
import * as THREE from 'three'
import type { DesignSpec } from '../spec/types'
import { alloyById, settingById } from '../catalog'
import { sizeToDiameter } from '../lib/sizing'
import { Stone, stoneDims } from './Stone'

export function Ring({ spec }: { spec: DesignSpec }) {
  const alloy = alloyById(spec.metal.alloyId)
  const setting = settingById(spec.setting.typeId)
  const d = stoneDims(spec.center.shapeId, spec.center.carat)

  const metal = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: alloy.color,
    metalness: 1,
    roughness: alloy.roughness,
    envMapIntensity: 1.4,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35
  }), [alloy])

  const insideR = sizeToDiameter(spec.ring.size) / 2
  const tube = spec.ring.thickness / 2
  const centreR = insideR + tube
  const seatY = centreR + tube * 0.2
  const stoneY = seatY + d.pavH * 0.55
  const prongR = 0.42 + d.width * 0.012

  const prongs = useMemo(() => {
    if (setting.bezel) return []
    const out: { pos: [number, number, number]; rot: [number, number, number]; h: number }[] = []
    const h = d.pavH * 0.75 + d.crownH * 1.1
    for (let i = 0; i < setting.prongs; i++) {
      const a = (i / setting.prongs) * Math.PI * 2 + Math.PI / setting.prongs
      out.push({
        pos: [Math.cos(a) * d.r * 0.99, stoneY - d.pavH * 0.2 + (h / 2) * 0.15, Math.sin(a) * d.r * 0.99 * d.lwRatio],
        rot: [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1],
        h
      })
    }
    return out
  }, [setting, d, stoneY])

  return (
    <group>
      {/* Shank — a torus scaled on the ring axis to give width != thickness */}
      <mesh material={metal} scale={[1, 1, spec.ring.width / spec.ring.thickness]}>
        <torusGeometry args={[centreR, tube, 24, 180]} />
      </mesh>

      <group position={[0, stoneY, 0]}>
        <Stone shapeId={spec.center.shapeId} stoneTypeId={spec.center.stoneTypeId} carat={spec.center.carat} />
      </group>

      {/* Gallery rail */}
      <mesh material={metal} rotation={[Math.PI / 2, 0, 0]} position={[0, stoneY - d.pavH * 0.55, 0]} scale={[1, 1, d.lwRatio]}>
        <torusGeometry args={[d.r * 0.8, prongR * 0.85, 10, 44]} />
      </mesh>

      {setting.bezel ? (
        <mesh material={metal} position={[0, stoneY + d.crownH * 0.25, 0]} scale={[1, 1, d.lwRatio]}>
          <cylinderGeometry args={[d.r * 1.13, d.r * 1.06, d.girdleH + d.crownH * 1.2, 48, 1, true]} />
        </mesh>
      ) : (
        prongs.map((p, i) => (
          <group key={i}>
            <mesh material={metal} position={p.pos} rotation={p.rot}>
              <cylinderGeometry args={[prongR * 0.85, prongR, p.h, 10]} />
            </mesh>
            <mesh material={metal} position={[p.pos[0] * 0.94, stoneY + d.crownH * 0.85, p.pos[2] * 0.94]}>
              <sphereGeometry args={[prongR * 0.9, 12, 10]} />
            </mesh>
          </group>
        ))
      )}
    </group>
  )
}
