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
