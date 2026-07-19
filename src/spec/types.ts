/**
 * DesignSpec — the single source of truth for a piece.
 * Geometry, weight, cost and the tech sheet are all DERIVED from this.
 * Nothing is ever stored as a mesh.
 */
export type FitProfile = 'standard' | 'comfort'

export interface DesignSpec {
  version: 1
  ring: {
    size: number          // US ring size, quarter increments
    width: number         // mm, across the finger
    thickness: number     // mm, radial
    fit: FitProfile
  }
  metal: { alloyId: string }
  center: { shapeId: string; stoneTypeId: string; carat: number }
  setting: { typeId: string }
}

export const DEFAULT_SPEC: DesignSpec = {
  version: 1,
  ring: { size: 6.5, width: 2.0, thickness: 1.8, fit: 'standard' },
  metal: { alloyId: '14ky' },
  center: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1.0 },
  setting: { typeId: 'p4' }
}
