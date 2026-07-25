import { useMemo } from 'react'
import * as THREE from 'three'
import type { DesignSpec } from '../spec/types'
import { alloyById } from '../catalog'
import { isHidden } from '../lib/features'
import { stoneDims } from './Stone'
import { Head } from './Head'
import { useMetalMaterial } from './material'
import { necklaceChainVertices } from '../lib/necklaceChain'

const MM_PER_INCH = 25.4

/** Necklace / chain hanging as a loop, optionally carrying a pendant. */
export function Necklace({ spec }: { spec: DesignSpec }) {
  const alloy = alloyById(spec.metal.alloyId)
  const metal = useMetalMaterial(alloy, spec.finish)
  const headMetalMat = useMetalMaterial(alloyById(spec.metal.headAlloyId ?? spec.metal.alloyId), spec.finish)
  const headMetal = spec.metal.twoTone && spec.metal.headAlloyId ? headMetalMat : metal
  const { length, gauge, hasPendant, chainStyle } = spec.necklace
  const circ = length * MM_PER_INCH
  const R = circ / (Math.PI * 2)
  const d = stoneDims(spec.center.shapeId, spec.center.carat)

  // Real interlocking chain around the neckline loop (regenerated on style/size).
  const chainGeo = useMemo(() => {
    const soup = necklaceChainVertices(R, Math.max(gauge * 0.5, 0.4), chainStyle ?? 'cable')
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(soup), 3))
    g.computeVertexNormals()
    return g
  }, [R, gauge, chainStyle])

  return (
    <group>
      {/* Chain loop, hanging in the view plane — vertical drape via a slight Y stretch */}
      {!isHidden(spec, 'chain') && (
        <mesh geometry={chainGeo} material={metal} scale={[1, 1.15, 1]} />
      )}

      {hasPendant && (
        <group position={[0, -R * 1.15 - d.r * d.lwRatio, 0]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Head material={headMetal} shapeId={spec.center.shapeId} stoneTypeId={spec.center.stoneTypeId}
              carat={spec.center.carat} settingId={spec.setting.typeId} grading={spec.center.grading}
              showStone={!isHidden(spec, 'stone')} showSetting={!isHidden(spec, 'head')} />
          </group>
        </group>
      )}
    </group>
  )
}
