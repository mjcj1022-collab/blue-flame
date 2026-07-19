/**
 * Shop market settings the metal and pricing engines read, so quotes can be
 * tuned live without touching code. A module singleton (kept in sync from the
 * store) keeps the engine signatures clean.
 */
export interface Market {
  spotFactor: number   // multiplier on every alloy's spot price
  margin: number       // retail multiplier on the subtotal
  finishFee: number    // cast + finish + polish, $
  meleeLabor: number   // setting labor per accent stone, $
  rhodiumFee: number   // rhodium plating pass, $
}

export const DEFAULT_MARKET: Market = { spotFactor: 1, margin: 1.35, finishFee: 95, meleeLabor: 12, rhodiumFee: 45 }

export const MARKET: Market = { ...DEFAULT_MARKET }

export function setMarket(patch: Partial<Market>): void {
  Object.assign(MARKET, patch)
}
