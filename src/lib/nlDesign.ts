import { NO_STONE, type DesignSpec, type ProductCategory, type FinishId } from '../spec/types'

/**
 * A rule-based "describe a piece" parser: natural language → a DesignSpec patch.
 * No LLM/API — it reads the phrases a jeweler actually types (carat, cut, stone,
 * metal, setting, size, finish) and applies what it recognizes over the current
 * design. Returns the new spec plus the human-readable terms it matched.
 */

const CATEGORY: [RegExp, ProductCategory][] = [
  [/\b(pendant)\b/, 'pendant'],
  [/\b(earrings?|studs?)\b/, 'earring'],
  [/\b(bracelet|bangle|cuff|tennis)\b/, 'bracelet'],
  [/\b(necklace|chain)\b/, 'necklace'],
  [/\b(ring|band)\b/, 'ring']
]

// facet-count shapes; 'emerald' as a cut is disambiguated from the stone below
const SHAPE: [RegExp, string, string][] = [
  [/\bround\b/, 'rd', 'Round'],
  [/\boval\b/, 'ov', 'Oval'],
  [/\bcushion\b/, 'cu', 'Cushion'],
  [/\bprincess\b/, 'pr', 'Princess'],
  [/emerald[\s-]?cut/, 'em', 'Emerald cut'],
  [/\basscher\b/, 'as', 'Asscher'],
  [/\bradiant\b/, 'ra', 'Radiant'],
  [/\bpear\b/, 'pe', 'Pear'],
  [/\bmarquise\b/, 'ma', 'Marquise'],
  [/\bheart\b/, 'he', 'Heart'],
  [/\btrillion\b/, 'tr', 'Trillion'],
  [/\bbaguette\b/, 'bg', 'Baguette'],
  [/old[\s-]?european/, 'oe', 'Old European'],
  [/rose[\s-]?cut/, 'ro', 'Rose cut'],
  [/\bcabochon\b/, 'ca', 'Cabochon'],
  [/\bbriolette\b/, 'br', 'Briolette']
]

// multi-word first so "white sapphire" beats "sapphire"
const STONE: [RegExp, string, string][] = [
  [/lab[\s-]?(grown|created)?\s*diamond|lab[\s-]?grown/, 'lab', 'Lab-grown Diamond'],
  [/white\s*sapphire/, 'wsp', 'White Sapphire'],
  [/pink\s*sapphire/, 'psp', 'Pink Sapphire'],
  [/yellow\s*sapphire/, 'ysp', 'Yellow Sapphire'],
  [/\bdiamond\b/, 'dia', 'Diamond'],
  [/\bmoissanite\b/, 'moi', 'Moissanite'],
  [/\bsapphire\b/, 'sap', 'Blue Sapphire'],
  [/\bruby\b/, 'rub', 'Ruby'],
  [/\balexandrite\b/, 'alx', 'Alexandrite'],
  [/\baquamarine\b|\baqua\b/, 'aqu', 'Aquamarine'],
  [/\bmorganite\b/, 'mor', 'Morganite'],
  [/\bspinel\b/, 'spn', 'Spinel'],
  [/\btanzanite\b/, 'tan', 'Tanzanite'],
  [/\btsavorite\b/, 'tsv', 'Tsavorite'],
  [/\btourmaline\b/, 'tur', 'Tourmaline'],
  [/\bgarnet\b/, 'gar', 'Garnet'],
  [/\bperidot\b/, 'per', 'Peridot'],
  [/\bamethyst\b/, 'ame', 'Amethyst'],
  [/\bcitrine\b/, 'cit', 'Citrine'],
  [/\btopaz\b/, 'tpz', 'Topaz'],
  [/\bopal\b/, 'opa', 'Opal'],
  [/\bturquoise\b/, 'tqs', 'Turquoise'],
  [/\blapis\b/, 'lap', 'Lapis Lazuli'],
  [/\bonyx\b/, 'onx', 'Onyx'],
  [/\bpearl\b/, 'pea', 'Pearl'],
  [/\bemerald\b/, 'eme', 'Emerald']   // stone; only reached when not "emerald cut"
]

const SETTING: [RegExp, string, string][] = [
  [/double\s*halo/, 'hl2', 'Double halo'],
  [/\bhalo\b/, 'hal', 'Halo'],
  [/three[\s-]?stone|trilogy/, 'th3', 'Three-stone'],
  [/pav[eé]/, 'pav', 'Pavé'],
  [/\bchannel\b/, 'chn', 'Channel'],
  [/\beternity\b/, 'etr', 'Eternity'],
  [/\bbezel\b/, 'bz', 'Bezel'],
  [/flush|gypsy/, 'fl', 'Flush'],
  [/\btension\b/, 'ten', 'Tension'],
  [/compass|(eight|8)[\s-]?prong/, 'p8', 'Compass 8-prong'],
  [/double[\s-]?claw/, 'dc', 'Double-claw'],
  [/(six|6)[\s-]?prong/, 'p6', '6-prong'],
  [/(four|4)[\s-]?prong|solitaire/, 'p4', 'Solitaire 4-prong']
]

const FINISH: [RegExp, FinishId, string][] = [
  [/high\s*polish|polished|mirror/, 'polish', 'High polish'],
  [/\bsatin\b/, 'satin', 'Satin'],
  [/\bmatte\b/, 'matte', 'Matte'],
  [/sandblast|frosted/, 'sandblast', 'Sandblast'],
  [/\bhammered\b/, 'hammered', 'Hammered'],
  [/florentine/, 'florentine', 'Florentine'],
  [/oxidi[sz]ed|blackened/, 'oxidized', 'Oxidised']
]

/** Colour word → alloy suffix; karat prefix parsed separately. */
const GOLD_COLOR: [RegExp, string, string][] = [
  [/rose\s*gold|\brose\b/, 'kr', 'rose'],
  [/white\s*gold/, 'kw', 'white'],
  [/green\s*gold/, 'kg', 'green'],
  [/yellow\s*gold|\bgold\b/, 'ky', 'yellow']
]
const OTHER_METAL: [RegExp, string, string][] = [
  [/platinum|\bplat\b/, 'pt95', 'Platinum'],
  [/palladium/, 'pd95', 'Palladium'],
  [/sterling|\bsilver\b/, 'ss92', 'Sterling silver'],
  [/titanium/, 'ti', 'Titanium'],
  [/tungsten/, 'tuc', 'Tungsten'],
  [/cobalt/, 'coc', 'Cobalt'],
  [/stainless|\bsteel\b/, 'ss31', 'Stainless steel'],
  [/zirconium/, 'zr', 'Zirconium'],
  [/damascus/, 'dam', 'Damascus'],
  [/\bbrass\b/, 'brs', 'Brass'],
  [/\bbronze\b/, 'brz', 'Bronze']
]

const first = <R extends [RegExp, ...unknown[]]>(text: string, table: readonly R[]): R | null => table.find(([re]) => re.test(text)) ?? null

export interface ParseResult { spec: DesignSpec; matched: string[] }

export function parseDesign(input: string, base: DesignSpec): ParseResult {
  const t = input.toLowerCase()
  const matched: string[] = []

  // category
  const catHit = first(t, CATEGORY)
  let category = base.category
  if (catHit) { category = catHit[1]; matched.push(cap(category)) }

  // metal: karat prefix + colour, or a named metal
  let alloyId: string | undefined
  const goldHit = first(t, GOLD_COLOR)
  if (goldHit) {
    const kt = t.match(/\b(10|14|18|22|24)\s*k(?:t|arat)?\b/)
    const karat = kt ? kt[1] : '14'
    alloyId = `${karat}${goldHit[1]}`
    matched.push(`${karat}K ${goldHit[2]} gold`)
  } else {
    const metalHit = first(t, OTHER_METAL)
    if (metalHit) { alloyId = metalHit[1]; matched.push(metalHit[2]) }
  }

  // shape (cut)
  const shapeHit = first(t, SHAPE)
  let shapeId: string | undefined
  if (shapeHit) { shapeId = shapeHit[1]; matched.push(shapeHit[2]) }

  // stone, or an explicit "plain / no stone / wedding band"
  const plain = /\bplain\b|no\s*(centre|center|stone)|wedding\s*band/.test(t)
  let stoneTypeId: string | undefined
  if (plain) { stoneTypeId = NO_STONE; matched.push('No centre stone') }
  else {
    const stoneHit = first(t, STONE)
    if (stoneHit) { stoneTypeId = stoneHit[1]; matched.push(stoneHit[2]) }
  }

  // carat (avoid "karat")
  let carat: number | undefined
  const ctHit = t.match(/(\d+(?:\.\d+)?)\s*(?:ct|carat|cts)\b/)
  if (ctHit) { carat = Math.min(20, Math.max(0.05, parseFloat(ctHit[1]))); matched.push(`${carat.toFixed(2)} ct`) }

  // ring size
  let size: number | undefined
  const szHit = t.match(/size\s*(\d+(?:\.\d+)?)/)
  if (szHit) { size = Math.min(16, Math.max(2, parseFloat(szHit[1]))); matched.push(`Size ${szHit[1]}`) }

  // setting
  const setHit = first(t, SETTING)
  let settingId: string | undefined
  if (setHit) { settingId = setHit[1]; matched.push(setHit[2]); if (!catHit) category = 'ring' }

  // finish
  const finHit = first(t, FINISH)
  let finish: FinishId | undefined
  if (finHit) { finish = finHit[1]; matched.push(finHit[2]) }

  // If a stone-carrying setting was named but the piece has no stone, default one.
  if (settingId && !plain && (stoneTypeId ?? base.center.stoneTypeId) === NO_STONE) stoneTypeId = 'dia'

  const spec: DesignSpec = {
    ...base,
    category,
    metal: alloyId ? { ...base.metal, alloyId } : base.metal,
    center: {
      ...base.center,
      ...(shapeId ? { shapeId } : {}),
      ...(stoneTypeId !== undefined ? { stoneTypeId } : {}),
      ...(carat !== undefined ? { carat } : {})
    },
    setting: settingId ? { typeId: settingId } : base.setting,
    ring: size !== undefined ? { ...base.ring, size } : base.ring,
    finish: finish ?? base.finish
  }

  return { spec, matched }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
