import * as THREE from 'three'
import { shapeById, stoneMm } from '../catalog'
import { Stone } from './Stone'

/**
 * A row of accent stones set continuously around the whole band — an eternity /
 * full-pavé ring. Each stone sits on the outer face of the band and faces
 * radially outward. No centre stone required.
 */
export function EternityBand({ material, centreR, tube, count, accentCt, stoneTypeId }: {
  material: THREE.Material
  centreR: number
  tube: number
  count: number
  accentCt: number
  stoneTypeId: string
}) {
  const round = shapeById('rd')
  const accentW = Math.max(stoneMm(round, accentCt).width, 0.7)
  const r = centreR + tube * 0.35   // seated just proud of the outer face
  const n = Math.max(count, 6)

  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        // Rotate so the stone's crown (+Y) points radially outward at angle a.
        return (
          <group key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[0, 0, a - Math.PI / 2]}>
            {/* shared-prong beads either side of each stone */}
            <mesh material={material} position={[0, -accentW * 0.25, accentW * 0.55]}>
              <sphereGeometry args={[accentW * 0.22, 8, 6]} />
            </mesh>
            <mesh material={material} position={[0, -accentW * 0.25, -accentW * 0.55]}>
              <sphereGeometry args={[accentW * 0.22, 8, 6]} />
            </mesh>
            <Stone shapeId="rd" stoneTypeId={stoneTypeId} carat={accentCt} />
          </group>
        )
      })}
    </group>
  )
}
