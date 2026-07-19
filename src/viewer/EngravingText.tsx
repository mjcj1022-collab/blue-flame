import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import type { DesignSpec } from '../spec/types'
import { sizeToDiameter } from '../lib/sizing'

/**
 * The typed engraving, laid on the band surface where the position slider puts
 * it. Inside engraving faces into the ring; outside faces out. Flat incised
 * lettering — a legible stand-in for a cut engraving.
 */
export function EngravingText({ spec }: { spec: DesignSpec }) {
  const ref = useRef<THREE.Group>(null)
  const text = spec.engraving.text.trim()
  const inside = spec.engraving.placement === 'inside'
  const insideR = sizeToDiameter(spec.ring.size) / 2
  const outerR = insideR + spec.ring.thickness
  const surfaceR = inside ? insideR + 0.06 : outerR + 0.06
  const angle = (spec.engraving.position ?? 0.75) * Math.PI * 2
  const fontSize = Math.max(spec.ring.width * 0.5, 0.9)

  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0)
    const normal = inside ? radial.clone().negate() : radial
    const up = new THREE.Vector3(0, 0, 1)
    const right = new THREE.Vector3().crossVectors(up, normal).normalize()
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
    g.position.set(radial.x * surfaceR, radial.y * surfaceR, 0)
  }, [angle, surfaceR, inside])

  if (!text) return null

  return (
    <group ref={ref}>
      <Text
        fontSize={fontSize}
        color="#2a2622"
        anchorX="center"
        anchorY="middle"
        maxWidth={spec.ring.width * 12}
        outlineWidth={fontSize * 0.02}
        outlineColor="#000000"
        letterSpacing={-0.02}
      >
        {text}
      </Text>
    </group>
  )
}
