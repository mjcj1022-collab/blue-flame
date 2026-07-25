/**
 * Daily precious-metal spot feed. Fetches gold / silver / platinum / palladium
 * spot (USD per troy ounce) from a metals API — key held here, never sent to the
 * browser — and caches it for a day so the client's quotes track the real market
 * without hammering the provider. Provider is env-selectable; with no key set it
 * reports "static" and the client keeps the catalog's built-in spots.
 *
 * Env:
 *   METALS_API_KEY   the provider key (unset → static fallback)
 *   METALS_PROVIDER  'metalpriceapi' (default, one request) | 'goldapi' (per-metal)
 */

type Sym = 'XAU' | 'XAG' | 'XPT' | 'XPD'
export type SpotPrices = Partial<Record<Sym, number>>
export interface SpotResult { prices: SpotPrices; at: string; source: string; stale: boolean }

const SYMS: Sym[] = ['XAU', 'XAG', 'XPT', 'XPD']
const DAY_MS = 24 * 60 * 60 * 1000
const round2 = (n: number) => Math.round(n * 100) / 100

let cache: SpotResult | null = null
let cachedAtMs = 0

/** metalpriceapi.com — one call for all metals, base USD. */
async function fetchMetalPriceApi(key: string): Promise<SpotPrices> {
  const url = `https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(key)}&base=USD&currencies=XAU,XAG,XPT,XPD`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`metalpriceapi ${r.status}`)
  const j = await r.json() as { rates?: Record<string, number> }
  return normalizeUsdBase(j.rates ?? {})
}

/**
 * Normalize a USD-base rate table to USD/ozt. metals APIs return either a direct
 * `USDXAU` = price per ounce, or `XAU` = ounces per USD (inverse) — handle both.
 */
export function normalizeUsdBase(rates: Record<string, number>): SpotPrices {
  const out: SpotPrices = {}
  for (const s of SYMS) {
    const direct = rates[`USD${s}`]   // some providers expose price/ozt directly
    const raw = rates[s]
    // A per-ounce price is always ≫1 (gold ~2000-4000, silver ~20-50); an
    // "ounces per USD" quote is always ≪1. Use magnitude to tell them apart so
    // the feed works whether the provider returns direct prices or inverses.
    let price: number | undefined
    if (typeof direct === 'number' && direct > 1) price = direct
    else if (typeof raw === 'number' && raw > 1) price = raw
    else if (typeof raw === 'number' && raw > 0) price = 1 / raw
    if (typeof price === 'number' && price > 1) out[s] = round2(price)
  }
  return out
}

/** goldapi.io — one call per metal, `price` is already USD/ozt. */
async function fetchGoldApi(key: string): Promise<SpotPrices> {
  const out: SpotPrices = {}
  for (const s of SYMS) {
    try {
      const r = await fetch(`https://www.goldapi.io/api/${s}/USD`, { headers: { 'x-access-token': key, 'Content-Type': 'application/json' } })
      if (!r.ok) continue
      const j = await r.json() as { price?: number }
      if (typeof j.price === 'number' && j.price > 1) out[s] = round2(j.price)
    } catch { /* skip this metal */ }
  }
  return out
}

export async function getSpot(): Promise<SpotResult> {
  const now = Date.now()
  if (cache && now - cachedAtMs < DAY_MS) return cache

  const key = process.env.METALS_API_KEY
  if (!key) {
    cache = { prices: {}, at: new Date().toISOString(), source: 'static', stale: true }
    cachedAtMs = now
    return cache
  }

  const provider = (process.env.METALS_PROVIDER || 'metalpriceapi').toLowerCase()
  try {
    const prices = provider === 'goldapi' ? await fetchGoldApi(key) : await fetchMetalPriceApi(key)
    if (!Object.keys(prices).length) throw new Error('empty prices')
    cache = { prices, at: new Date().toISOString(), source: provider, stale: false }
    cachedAtMs = now
    return cache
  } catch {
    // Serve the last good day's prices if we have them; otherwise fall to static.
    if (cache && Object.keys(cache.prices).length) return { ...cache, stale: true }
    // A key is set but the first fetch failed (transient 5xx, empty payload, …).
    // Return a transient static result WITHOUT caching it — otherwise a fresh
    // timestamp would suppress the live feed for a full day. Next call retries.
    return { prices: {}, at: new Date().toISOString(), source: 'static', stale: true }
  }
}
