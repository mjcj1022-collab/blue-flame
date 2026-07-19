import * as THREE from 'three'
import { shapeById, stoneMm } from '../catalog'
import { Stone } from './Stone'

/**
 * A ring (or double ring) of melee around the centre stone — a schematic halo
 * that reflects the accent count and size the melee designer sets.
 */
export function HaloRing({ material, centerStoneWidth, count, accentCt, stoneTypeId, double }: {
  material: THREE.Material
  centerStoneWidth: number
  count: number
  accentCt: number
  stoneTypeId: string
  double: boolean
}) {
  const round = shapeById('rd')
  const accentW = Math.max(stoneMm(round, accentCt).width, 0.6)
  const y = -centerStoneWidth * 0.02

  const rings = double
    ? [
        { r: centerStoneWidth / 2 + accentW / 2 + 0.25, n: Math.max(6, Math.round(count * 0.42)) },
        { r: centerStoneWidth / 2 + accentW * 1.5 + 0.5, n: count - Math.max(6, Math.round(count * 0.42)) }
      ]
    : [{ r: centerStoneWidth / 2 + accentW / 2 + 0.3, n: count }]

  return (
    <group position={[0, y, 0]}>
      {rings.map((ring, ri) =>
        Array.from({ length: Math.max(ring.n, 3) }).map((_, i) => {
          const a = (i / Math.max(ring.n, 3)) * Math.PI * 2
          return (
            <group key={`${ri}-${i}`} position={[Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r]}>
              {/* tiny bead of metal under each accent */}
              <mesh material={material} position={[0, -accentW * 0.3, 0]}>
                <sphereGeometry args={[accentW * 0.32, 8, 6]} />
              </mesh>
              <Stone shapeId="rd" stoneTypeId={stoneTypeId} carat={accentCt} />
            </group>
          )
        })
      )}
    </group>
  )
}
