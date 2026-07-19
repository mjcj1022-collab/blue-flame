import type { DesignSpec } from '../spec/types'
import { stoneOnPiece } from '../spec/types'
import { settingById } from '../catalog'

/**
 * The rendered pieces of a design, for the attribute pane. Each can be removed;
 * removal hides it from the render and drops it from weight and cost.
 */
export interface Feature { key: string; label: string }

export function designFeatures(spec: DesignSpec): Feature[] {
  const f: Feature[] = []
  const setting = settingById(spec.setting.typeId)

  switch (spec.category) {
    case 'ring': f.push({ key: 'band', label: 'Band' }); break
    case 'pendant':
      f.push({ key: 'bail', label: 'Bail' })
      if (spec.pendant.hasChain) f.push({ key: 'chain', label: 'Chain' })
      break
    case 'earring': f.push({ key: 'posts', label: 'Posts & backs' }); break
    case 'bracelet': f.push({ key: 'band', label: spec.bracelet.kind === 'tennis' ? 'Links' : 'Body' }); break
    case 'necklace': f.push({ key: 'chain', label: 'Chain' }); break
  }

  if (stoneOnPiece(spec)) {
    f.push({ key: 'stone', label: 'Center stone' })
    f.push({ key: 'head', label: 'Setting' })
    if (setting.id === 'hal' || setting.id === 'hl2') f.push({ key: 'halo', label: 'Halo / melee' })
  }
  if (spec.engraving.text.trim()) f.push({ key: 'engraving', label: 'Engraving' })
  return f
}

export const isHidden = (spec: DesignSpec, key: string): boolean =>
  (spec.hidden ?? []).includes(key)
