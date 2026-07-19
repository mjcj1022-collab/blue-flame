import { useMemo } from 'react'
import * as THREE from 'three'
import type { Alloy } from '../catalog'

/** One physically-based metal material per alloy, memoised on the alloy. */
export function useMetalMaterial(alloy: Alloy) {
  return useMemo(() => new THREE.MeshPhysicalMaterial({
    color: alloy.color,
    metalness: 1,
    roughness: alloy.roughness,
    envMapIntensity: 1.4,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35
  }), [alloy])
}
