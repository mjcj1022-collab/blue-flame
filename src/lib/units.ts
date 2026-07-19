export const OZT = 31.1035          // grams per troy ounce
export const DWT = 1.55517          // grams per pennyweight

export const gToDwt  = (g: number) => g / DWT
export const gToOzt  = (g: number) => g / OZT

export type WeightUnit = 'g' | 'dwt'

export const formatWeight = (g: number, unit: WeightUnit) =>
  unit === 'g' ? `${g.toFixed(2)} g` : `${gToDwt(g).toFixed(2)} dwt`

export const money = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US')

export const money2 = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
