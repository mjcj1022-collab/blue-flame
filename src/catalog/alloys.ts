/**
 * Alloy catalog. Every row carries its own math, so adding a metal is a data
 * change and never a code change.
 *
 * density   g/cm3      ask your caster and override; mills differ by ~3%
 * fine      fraction   pure metal content; drives spot pricing and hallmark
 * spot      $/troy oz  REPLACE WITH A LIVE FEED BEFORE QUOTING A CLIENT
 * premium   fraction   fabrication markup on casting grain over spot
 * meltLoss  fraction   oxidation, crucible film, fines, per cycle
 * buttonMin grams      below this the button cannot feed shrinkage
 */
export interface Alloy {
  id: string
  name: string
  short: string
  density: number
  fine: number
  symbol: 'Au' | 'Ag' | 'Pt' | 'Pd'
  spot: number
  premium: number
  meltLoss: number
  buttonMin: number
  finishPenalty: number
  color: number
  roughness: number
  hallmark: string
}

export const ALLOYS: Alloy[] = [
  { id:'10ky', name:'10K Yellow',    short:'10KY', density:11.57, fine:0.417, symbol:'Au', spot:2400, premium:0.10, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD9BE84, roughness:0.24, hallmark:'10K' },
  { id:'14ky', name:'14K Yellow',    short:'14KY', density:13.07, fine:0.583, symbol:'Au', spot:2400, premium:0.09, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD8B36A, roughness:0.22, hallmark:'14K' },
  { id:'14kw', name:'14K White',     short:'14KW', density:12.61, fine:0.583, symbol:'Au', spot:2400, premium:0.11, meltLoss:0.020, buttonMin:8,  finishPenalty:0.01,  color:0xD9DCDE, roughness:0.16, hallmark:'14K' },
  { id:'14kr', name:'14K Rose',      short:'14KR', density:12.90, fine:0.583, symbol:'Au', spot:2400, premium:0.10, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD9A183, roughness:0.21, hallmark:'14K' },
  { id:'18ky', name:'18K Yellow',    short:'18KY', density:15.58, fine:0.750, symbol:'Au', spot:2400, premium:0.08, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xE6BE63, roughness:0.20, hallmark:'18K' },
  { id:'18kw', name:'18K White Pd',  short:'18KW', density:15.70, fine:0.750, symbol:'Au', spot:2400, premium:0.13, meltLoss:0.020, buttonMin:8,  finishPenalty:0.015, color:0xDCE0E2, roughness:0.15, hallmark:'18K' },
  { id:'18kr', name:'18K Rose',      short:'18KR', density:15.15, fine:0.750, symbol:'Au', spot:2400, premium:0.09, meltLoss:0.020, buttonMin:8,  finishPenalty:0,     color:0xD79A80, roughness:0.20, hallmark:'18K' },
  { id:'22ky', name:'22K Yellow',    short:'22KY', density:17.80, fine:0.916, symbol:'Au', spot:2400, premium:0.07, meltLoss:0.020, buttonMin:10, finishPenalty:0.01,  color:0xF0C24F, roughness:0.19, hallmark:'22K' },
  { id:'pt95', name:'Platinum 950',  short:'PT95', density:20.90, fine:0.950, symbol:'Pt', spot:1000, premium:0.12, meltLoss:0.015, buttonMin:15, finishPenalty:0.03,  color:0xC9CDD1, roughness:0.26, hallmark:'PLAT' },
  { id:'pd95', name:'Palladium 950', short:'PD95', density:12.00, fine:0.950, symbol:'Pd', spot:1050, premium:0.14, meltLoss:0.020, buttonMin:12, finishPenalty:0.02,  color:0xC6C9CC, roughness:0.24, hallmark:'PD950' },
  { id:'ss92', name:'Sterling .925', short:'SS92', density:10.36, fine:0.925, symbol:'Ag', spot:30,   premium:0.20, meltLoss:0.040, buttonMin:6,  finishPenalty:0,     color:0xCED2D5, roughness:0.24, hallmark:'925' },
  { id:'ag93', name:'Argentium .935',short:'AG93', density:10.20, fine:0.935, symbol:'Ag', spot:30,   premium:0.28, meltLoss:0.030, buttonMin:6,  finishPenalty:0,     color:0xD4D8DB, roughness:0.20, hallmark:'935' }
]

export const alloyById = (id: string): Alloy => ALLOYS.find(a => a.id === id) ?? ALLOYS[1]
