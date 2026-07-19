import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges } from '@react-three/drei'
import { useModeler, type SculptObject } from '../state/modeler'
import { renderGeometry } from '../lib/sculpt'

function useSculptMaterial(o: SculptObject) {
  return useMemo(() => {
    if (o.material === 'gem') {
      return new THREE.MeshPhysicalMaterial({
        color: o.color, metalness: 0, roughness: 0.02, transmission: 0.9,
        thickness: 4, ior: 2.0, clearcoat: 1, transparent: true
      })
    }
    return new THREE.MeshStandardMaterial({ color: o.color, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 })
  }, [o.material, o.color])
}

export function SculptMesh({ o }: { o: SculptObject }) {
  const { selectedId, select, mode, update } = useModeler()
  const ref = useRef<THREE.Mesh>(null)
  const geom = useMemo(() => renderGeometry(o), [o.kind, o.size, o.vertices])
  const material = useSculptMaterial(o)
  const selected = selectedId === o.id

  const mesh = (
    <mesh
      ref={ref}
      geometry={geom}
      material={material}
      position={o.position}
      rotation={o.rotation}
      scale={o.scale}
      onClick={e => { e.stopPropagation(); select(o.id) }}
      castShadow
    >
      {selected && <Edges scale={1.03} threshold={15} color="#C6A265" />}
    </mesh>
  )

  if (!selected) return mesh

  const commit = () => {
    const m = ref.current
    if (!m) return
    update(o.id, {
      position: [m.position.x, m.position.y, m.position.z],
      rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
      scale: [m.scale.x, m.scale.y, m.scale.z]
    })
  }

  return (
    <TransformControls mode={mode} onMouseUp={commit} size={0.8}>
      {mesh}
    </TransformControls>
  )
}
