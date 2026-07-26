import type { Material } from 'three'

/**
 * A Celtic knot medallion — a genuine interlaced (p,q) torus knot with real
 * over-under crossings, flattened slightly so it reads as a pendant. Used as the
 * necklace 'celtic' motif; reusable anywhere a knotwork charm is wanted.
 */
export function CelticKnot({ material, radius, tube }: { material: Material; radius: number; tube: number }) {
  return (
    <group>
      {/* the interlaced knot, flattened front-to-back into a medallion */}
      <mesh material={material} scale={[1, 1, 0.55]} castShadow>
        <torusKnotGeometry args={[radius, tube, 220, 20, 3, 2]} />
      </mesh>
      {/* a small bail at the top so it hangs from the chain */}
      <mesh material={material} position={[0, radius + tube * 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[tube * 1.6, tube * 0.55, 12, 32]} />
      </mesh>
    </group>
  )
}
