import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { sculptPull } from '../lib/sculpt'
import type { VertexTool } from '../state/modeler'

export interface VertexSculptorProps {
  /** Flat triangle-soup positions (x,y,z,…) at identity transform. */
  vertices: number[]
  color: number
  falloff: number
  symmetry: boolean
  /** 'select' = click only highlights a vertex; 'edit' = grab + drag gizmo. */
  tool: VertexTool
  /** Index of the currently highlighted vertex, or null. */
  selectedVertex: number | null
  /** Called with the nearest vertex when the surface is clicked. */
  onPick: (index: number, pos: [number, number, number]) => void
  /** Called once per drag on release, with the new positions. */
  onCommit: (vertices: number[]) => void
}

/**
 * Direct vertex sculpting for a flat triangle soup, shared by the Sculpt tab
 * (a baked SculptObject) and the Design tab (the parametric piece baked to a
 * mesh). The mesh renders at the scene root (identity), so world and local
 * coordinates coincide.
 *
 * Click the surface to grab the nearest vertex. In the Edit tool a translate
 * gizmo appears *at that vertex* and dragging pulls surrounding vertices with a
 * smooth falloff (the "Region" radius). In the Select tool the click only
 * highlights the vertex — orbit stays live and nothing moves by accident.
 *
 * The gizmo is attached to a dedicated handle Object3D positioned at the grab
 * point (the `object` prop), not to a wrapped child — drei's TransformControls
 * tracks the wrapper group's origin otherwise, which puts the gizmo at the
 * world origin instead of on the vertex.
 */
export function VertexSculptor({ vertices, color, falloff, symmetry, tool, selectedVertex, onPick, onCommit }: VertexSculptorProps) {
  // Live, mutable geometry — edits write straight into this buffer for instant
  // feedback; we only report to the store on release. Rebuilt when the stored
  // vertices change identity (a committed edit or undo/redo) — never mid-drag,
  // since dragging mutates the buffer in place without a store write.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(vertices), 3))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [vertices])
  useEffect(() => () => geom.dispose(), [geom])

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }),
    [color]
  )
  useEffect(() => () => material.dispose(), [material])

  // The object the gizmo drives, always at the current grab point.
  const handle = useMemo(() => new THREE.Object3D(), [])
  const baseRef = useMemo(() => ({ current: null as Float32Array | null }), [])
  const centerRef = useMemo(() => new THREE.Vector3(), [])
  const [active, setActive] = useState(false)

  // Switching to the Select tool retires any active drag gizmo.
  useEffect(() => { if (tool === 'select') setActive(false) }, [tool])

  const nearest = (p: THREE.Vector3): number => {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    let bi = 0, bd = Infinity
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - p.x, dy = pos.getY(i) - p.y, dz = pos.getZ(i) - p.z
      const d = dx * dx + dy * dy + dz * dz
      if (d < bd) { bd = d; bi = i }
    }
    return bi
  }

  const grab = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    // e.point is world-space; the geometry lives in the clicked mesh's local
    // space. Convert before matching (robust even inside a transformed parent).
    const lp = e.eventObject.worldToLocal(e.point.clone())
    const bi = nearest(lp)
    const c = new THREE.Vector3(pos.getX(bi), pos.getY(bi), pos.getZ(bi))
    onPick(bi, [c.x, c.y, c.z])
    if (tool === 'edit') {
      baseRef.current = (pos.array as Float32Array).slice()
      centerRef.copy(c)
      handle.position.copy(c)          // gizmo jumps to the grabbed vertex
      setActive(true)
    } else {
      setActive(false)
    }
  }

  const drag = () => {
    const base = baseRef.current
    if (!base) return
    const c = centerRef
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    sculptPull(base, [c.x, c.y, c.z], [handle.position.x - c.x, handle.position.y - c.y, handle.position.z - c.z], falloff, symmetry, pos.array as Float32Array)
    pos.needsUpdate = true
    geom.computeVertexNormals()
  }

  const commit = () => {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    onCommit(Array.from(pos.array as Float32Array))
    // Rebase so a follow-up drag starts clean from the handle's new spot.
    centerRef.copy(handle.position)
    baseRef.current = (pos.array as Float32Array).slice()
  }

  // The highlighted vertex, in the mesh's current (possibly mid-edit) space.
  const marker = useMemo(() => {
    if (selectedVertex == null) return null
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    if (selectedVertex >= pos.count) return null
    return new THREE.Vector3(pos.getX(selectedVertex), pos.getY(selectedVertex), pos.getZ(selectedVertex))
  }, [geom, selectedVertex])

  // Show the actual vertices as dots so grab points are visible; skipped on
  // dense meshes. The overlay never raycasts, so clicks still hit the surface.
  const showPoints = geom.getAttribute('position').count <= 20000
  const dotSize = tool === 'select' ? 0.85 : 0.6

  return (
    <>
      <mesh geometry={geom} material={material} onClick={grab} castShadow>
        <Edges scale={1.002} threshold={20} color="#3d454a" />
      </mesh>
      {showPoints && (
        <points geometry={geom} raycast={() => null}>
          <pointsMaterial size={dotSize} sizeAttenuation color="#9BB4C6" transparent opacity={tool === 'select' ? 0.85 : 0.7} />
        </points>
      )}

      {/* Static highlight for the picked vertex (hidden while a drag gizmo is up). */}
      {marker && !active && (
        <mesh position={marker} raycast={() => null}>
          <sphereGeometry args={[0.62, 18, 14]} />
          <meshBasicMaterial color={tool === 'select' ? '#7FC8FF' : '#C6A265'} toneMapped={false} />
        </mesh>
      )}

      {active && (
        <>
          {/* The handle sits at the grab point; a small sphere marks it and the
              gizmo attaches to it so both track together while dragging. */}
          <primitive object={handle}>
            <mesh raycast={() => null}>
              <sphereGeometry args={[0.55, 16, 12]} />
              <meshBasicMaterial color="#C6A265" toneMapped={false} />
            </mesh>
          </primitive>
          <TransformControls object={handle} mode="translate" size={1.1} onObjectChange={drag} onMouseUp={commit} />
        </>
      )}
    </>
  )
}
