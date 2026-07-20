import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useModeler, type SculptObject } from '../state/modeler'
import { renderGeometry } from '../lib/sculpt'

/**
 * Draw a stroke directly on a part's surface: each pointer position is
 * ray-cast onto the mesh, and on release the collected path is swept into a
 * tube and unioned (emboss) or subtracted (cut) from the part. Orbit is paused
 * while drawing so the stroke follows the pointer cleanly.
 */
export function SurfaceDraw({ o }: { o: SculptObject }) {
  const surfaceOp = useModeler(s => s.surfaceOp)
  const brush = useModeler(s => s.brush)
  const apply = useModeler(s => s.applySurfaceStroke)
  const controls = useThree(s => s.controls) as { enabled: boolean } | null

  const geom = useMemo(() => renderGeometry(o), [o.id, o.kind, o.vertices, JSON.stringify(o.params)])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: o.color, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }), [o.color])

  const drawing = useRef(false)
  const pts = useRef<THREE.Vector3[]>([])
  const [preview, setPreview] = useState<THREE.Vector3[]>([])

  const start = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    drawing.current = true
    pts.current = [e.point.clone()]
    setPreview([e.point.clone()])
    if (controls) controls.enabled = false
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drawing.current) return
    const p = e.point
    const last = pts.current[pts.current.length - 1]
    if (!last || last.distanceTo(p) > 0.15) { pts.current.push(p.clone()); setPreview(pts.current.slice()) }
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    if (controls) controls.enabled = true
    const path = pts.current.map(p => [p.x, p.y, p.z] as [number, number, number])
    pts.current = []; setPreview([])
    if (path.length >= 2) apply(o.id, path, surfaceOp, brush)
  }

  return (
    <>
      <mesh
        geometry={geom} material={material} position={o.position} rotation={o.rotation} scale={o.scale}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} castShadow
      />
      {preview.length >= 2 && (
        <Line points={preview} color={surfaceOp === 'cut' ? '#E06A5A' : '#C6A265'} lineWidth={3} />
      )}
    </>
  )
}
