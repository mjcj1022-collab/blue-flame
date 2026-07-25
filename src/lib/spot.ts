import { ALLOYS, CUSTOM_ALLOYS } from '../catalog'
import { apiConfigured, apiBase } from './api'

/**
 * Live precious-metal spot prices. The backend fetches the day's gold / silver /
 * platinum / palladium spot (USD per troy ounce) from a metals API — key held
 * server-side — and this applies it over the catalog's static per-ounce spots so
 * every quote reflects today's market. If there's no backend or the feed is
 * unavailable, the static spots stand and nothing breaks.
 */

export type SpotSymbol = 'XAU' | 'XAG' | 'XPT' | 'XPD'
export type SpotPrices = Partial<Record<SpotSymbol, number>>

/** Alloy `symbol` (Au/Ag/Pt/Pd) → metals-API symbol. Non-precious metals price
 *  per gram and are unaffected by spot. */
export const SYMBOL_TO_SPOT: Record<string, SpotSymbol> = { Au: 'XAU', Ag: 'XAG', Pt: 'XPT', Pd: 'XPD' }

export interface SpotMeta { at: string | null; source: string; prices: SpotPrices }

/** Module singleton so panels can show "gold $X/ozt · today" without prop-drilling. */
export const LIVE_SPOT: SpotMeta = { at: null, source: 'static', prices: {} }

/**
 * Overwrite the per-ounce spot on every catalog alloy whose metal has a live
 * price. Returns how many alloys were updated. Ignores missing / non-positive
 * quotes so a partial or bad feed can't zero out a price.
 */
export function applyLiveSpot(prices: SpotPrices): number {
  let n = 0
  for (const alloy of [...ALLOYS, ...CUSTOM_ALLOYS]) {
    const sym = SYMBOL_TO_SPOT[alloy.symbol]
    if (!sym) continue
    const p = prices[sym]
    if (typeof p === 'number' && p > 0 && Number.isFinite(p)) { alloy.spot = p; n++ }
  }
  return n
}

/**
 * Pull the day's spot from the backend and apply it. Returns the metadata (date,
 * source). No-ops cleanly when the app runs standalone (no backend configured).
 */
export async function fetchAndApplySpot(): Promise<SpotMeta> {
  if (!apiConfigured()) return LIVE_SPOT
  try {
    const res = await fetch(`${apiBase()}/api/spot`, { headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) return LIVE_SPOT
    const data = await res.json() as { prices?: SpotPrices; at?: string; source?: string }
    const prices = data.prices ?? {}
    if (Object.keys(prices).length) {
      applyLiveSpot(prices)
      LIVE_SPOT.prices = prices
      LIVE_SPOT.at = data.at ?? null
      LIVE_SPOT.source = data.source ?? 'live'
    }
    return LIVE_SPOT
  } catch {
    return LIVE_SPOT   // offline / waking server — keep static spots
  }
}
