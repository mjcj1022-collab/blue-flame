import type { DesignSpec } from '../spec/types'
import { shapeById, stoneMm, settingById } from '../catalog'
import { sizeToDiameter } from './sizing'

/**
 * Shank cross-section profile factor.
 *
 * A torus has an ELLIPTICAL cross-section, which under-weighs a real band by
 * pi/4 (about 21%). Bands are near-rectangular with broken edges, so model the
 * shank as cross-section area times centreline circumference instead.
 */
const PROFILE_FLAT = 0.90
const COMFORT_HOLLOW = 0.91   // domed interior removes roughly 9% of the section

export interface VolumeBreakdown {
  shank: number
  head: number
  total: number     // mm3
}

export function computeVolume(spec: DesignSpec): VolumeBreakdown {
  const { size, width, thickness, fit } = spec.ring
  const setting = settingById(spec.setting.typeId)
  const shape = shapeById(spec.center.shapeId)
  const { width: stoneW } = stoneMm(shape, spec.center.carat)

  const insideR = sizeToDiameter(size) / 2
  const tube = thickness / 2
  const centreR = insideR + tube

  let section = width * thickness * PROFILE_FLAT
  if (fit === 'comfort') section *= COMFORT_HOLLOW
  const shank = section * 2 * Math.PI * centreR

  // Head. Prong and rail stock scale with stone size — a 3 ct head is not a
  // 1 ct head enlarged by eye. Calibrated against catalogue head weights.
  const r = stoneW / 2
  const prongR = 0.42 + stoneW * 0.012
  let head = 0

  if (setting.bezel) {
    head += Math.PI * ((r * 1.15) ** 2 - (r * 1.02) ** 2) * (stoneW * 0.45)  // wall
    head += 2 * Math.PI * Math.PI * (r * 0.80) * 0.30 * 0.30                  // seat rail
  } else {
    head += setting.prongs * Math.PI * prongR * prongR * (stoneW * 0.95)      // prongs
    head += 2 * (2 * Math.PI * Math.PI * (r * 0.82) * (prongR * 0.85) ** 2)   // two gallery rails
  }
  head += Math.PI * 0.65 * 0.65 * (stoneW * 0.35)                             // peg into shank

  const total = Math.max(shank + head, 40)
  return { shank, head, total }
}
