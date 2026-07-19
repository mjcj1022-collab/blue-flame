/**
 * Pure metals used in jewelry alloys. Density and melting point are physical
 * constants; color is the metal's own hue, used to tint the mixed result.
 */
export interface MetalElement {
  id: string
  name: string
  symbol: string
  density: number   // g/cm³
  melt: number      // °C, pure
  color: number     // hex
  precious: boolean
  role: string
}

export const ELEMENTS: MetalElement[] = [
  { id: 'au', name: 'Gold',      symbol: 'Au', density: 19.32, melt: 1064, color: 0xFFD65A, precious: true,  role: 'The precious base. Karat is its share of the mix.' },
  { id: 'ag', name: 'Silver',    symbol: 'Ag', density: 10.49, melt: 962,  color: 0xEDEDED, precious: true,  role: 'Whitens and softens; pushes gold toward green.' },
  { id: 'cu', name: 'Copper',    symbol: 'Cu', density: 8.96,  melt: 1085, color: 0xC87533, precious: false, role: 'Reddens and hardens; the rose in rose gold.' },
  { id: 'zn', name: 'Zinc',      symbol: 'Zn', density: 7.14,  melt: 420,  color: 0xC4CACE, precious: false, role: 'Deoxidizer; lowers melt and improves flow.' },
  { id: 'ni', name: 'Nickel',    symbol: 'Ni', density: 8.90,  melt: 1455, color: 0xD9DCD6, precious: false, role: 'Hard white; bright but allergenic, often plated.' },
  { id: 'pd', name: 'Palladium', symbol: 'Pd', density: 12.02, melt: 1555, color: 0xCED0D2, precious: true,  role: 'Precious whitener; naturally white gold, no rhodium.' },
  { id: 'pt', name: 'Platinum',  symbol: 'Pt', density: 21.45, melt: 1768, color: 0xD6D9DC, precious: true,  role: 'Dense, grey-white, hypoallergenic.' },
  { id: 'co', name: 'Cobalt',    symbol: 'Co', density: 8.90,  melt: 1495, color: 0xB8C0C8, precious: false, role: 'Whitener/hardener in platinum casting alloys.' },
  { id: 'zn2', name: 'Tin',      symbol: 'Sn', density: 7.31,  melt: 232,  color: 0xD2D2D2, precious: false, role: 'Lowers melt; used in some solders and pewter.' },
  { id: 'ge', name: 'Germanium', symbol: 'Ge', density: 5.32,  melt: 938,  color: 0xC0C4C8, precious: false, role: 'Argentium’s tarnish and firescale resistance.' }
]

export const elementById = (id: string): MetalElement | undefined => ELEMENTS.find(e => e.id === id)
