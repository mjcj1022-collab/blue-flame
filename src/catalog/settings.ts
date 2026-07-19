export interface SettingType {
  id: string
  name: string
  variety: string
  prongs: number
  bezel: boolean
  fee: number
  finishPenalty: number
  resizeRange: string
}

export const SETTINGS: SettingType[] = [
  { id:'p4', name:'4-prong', variety:'Classic',    prongs:4, bezel:false, fee:85,  finishPenalty:0,     resizeRange:'plus or minus 2 sizes' },
  { id:'p6', name:'6-prong', variety:'Tiffany',    prongs:6, bezel:false, fee:110, finishPenalty:0.005, resizeRange:'plus or minus 2 sizes' },
  { id:'p8', name:'Compass', variety:'8-prong',    prongs:8, bezel:false, fee:140, finishPenalty:0.01,  resizeRange:'plus or minus 2 sizes' },
  { id:'bz', name:'Bezel',   variety:'Protective', prongs:0, bezel:true,  fee:145, finishPenalty:0.015, resizeRange:'plus or minus 1 size' }
]

export const settingById = (id: string): SettingType => SETTINGS.find(s => s.id === id) ?? SETTINGS[0]
