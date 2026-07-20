import * as THREE from 'three'
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json'
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json'
import gentilis from 'three/examples/fonts/gentilis_regular.typeface.json'
import optimer from 'three/examples/fonts/optimer_regular.typeface.json'

// Parsed once at load — bundled, no network (offline).
const loader = new FontLoader()
type FontData = Parameters<typeof loader.parse>[0]
export const TEXT_FONTS: Record<string, Font> = {
  Block: loader.parse(helvetikerBold as unknown as FontData),
  Sans: loader.parse(helvetiker as unknown as FontData),
  Serif: loader.parse(gentilis as unknown as FontData),
  Script: loader.parse(optimer as unknown as FontData)
}
export const TEXT_FONT_NAMES = Object.keys(TEXT_FONTS)

/**
 * Extruded 3D text as a centred triangle soup, in mm. Each glyph is a closed
 * solid, so the result can be moved onto a part and unioned (emboss) or
 * subtracted (engrave). Empty / whitespace text yields nothing.
 */
export function textVertices(text: string, fontName: string, size = 4, depth = 1.2): number[] {
  const t = text.trim()
  if (!t) return []
  const font = TEXT_FONTS[fontName] ?? TEXT_FONTS.Block
  const geo = new TextGeometry(t, { font, size, height: Math.max(0.2, depth), curveSegments: 4, bevelEnabled: false })
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  if (bb) geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -depth / 2)
  const soup = geo.getIndex() ? geo.toNonIndexed() : geo
  const arr = Array.from(soup.getAttribute('position').array as Float32Array)
  if (soup !== geo) soup.dispose()
  geo.dispose()
  return arr
}

/**
 * Text wrapped around a circle in the XY plane (a ring band's circumference) at
 * `radius`, centred at the top. Each glyph sits upright along the band's width
 * (Z), tangent to the circle, and straddles the surface. Union to emboss around
 * the band, subtract to engrave into it.
 */
export function curvedTextVertices(text: string, fontName: string, radius: number, size = 2, depth = 1.2, faceOut = true): number[] {
  const t = text.trim()
  if (!t || radius <= 0.1) return []
  const font = TEXT_FONTS[fontName] ?? TEXT_FONTS.Block
  const items: { geo: THREE.BufferGeometry | null; adv: number }[] = []
  let total = 0
  for (const ch of t) {
    if (ch === ' ') { const adv = size * 0.55; items.push({ geo: null, adv }); total += adv; continue }
    const g = new THREE.BufferGeometry()
    const tg = new TextGeometry(ch, { font, size, height: Math.max(0.2, depth), curveSegments: 4, bevelEnabled: false })
    tg.computeBoundingBox()
    const bb = tg.boundingBox
    let w = size * 0.6
    if (bb) { w = bb.max.x - bb.min.x; tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -depth / 2) }
    g.copy(tg); tg.dispose()
    const adv = w + size * 0.2
    items.push({ geo: g, adv }); total += adv
  }

  const span = total / radius            // radians subtended
  let ang = Math.PI / 2 - span / 2       // centre the run at the top of the ring
  const up = new THREE.Vector3(0, 0, 1)
  const soup: number[] = []
  for (const { geo, adv } of items) {
    const mid = ang + (adv / 2) / radius
    if (geo) {
      const radial = new THREE.Vector3(Math.cos(mid), Math.sin(mid), 0)
      const tangent = new THREE.Vector3(-Math.sin(mid), Math.cos(mid), 0)
      const fwd = faceOut ? radial.clone() : radial.clone().negate()
      const right = faceOut ? tangent.clone() : tangent.clone().negate()
      const m = new THREE.Matrix4().makeBasis(right, up, fwd).setPosition(radial.clone().multiplyScalar(radius))
      geo.applyMatrix4(m)
      const s = geo.getIndex() ? geo.toNonIndexed() : geo
      const arr = s.getAttribute('position').array as Float32Array
      for (let i = 0; i < arr.length; i++) soup.push(arr[i])
      if (s !== geo) s.dispose()
      geo.dispose()
    }
    ang += adv / radius
  }
  return soup
}
