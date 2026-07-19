/** Stone types. rate is $/ct at 1.00 ct; price scales superlinearly with size. */
export interface StoneType {
  id: string
  name: string
  variety: string
  rate: number
  exponent: number
  mohs: number
  color: number
  ior: number
  transparent: boolean
  labGrown: boolean
  treatment?: string
  care?: string
}

export const STONES: StoneType[] = [
  { id:'dia', name:'Diamond',    variety:'Natural, G/VS',   rate:5200, exponent:1.55, mohs:10,   color:0xFFFFFF, ior:2.42, transparent:true,  labGrown:false },
  { id:'lab', name:'Diamond',    variety:'Lab-grown, G/VS', rate:900,  exponent:1.30, mohs:10,   color:0xFFFFFF, ior:2.42, transparent:true,  labGrown:true },
  { id:'moi', name:'Moissanite', variety:'Near-colorless',  rate:400,  exponent:1.15, mohs:9.25, color:0xFAFFFA, ior:2.65, transparent:true,  labGrown:true },
  { id:'sap', name:'Sapphire',   variety:'Blue',            rate:1100, exponent:1.40, mohs:9,    color:0x1E4FA8, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated' },
  { id:'rub', name:'Ruby',       variety:'Pigeon blood',    rate:1800, exponent:1.60, mohs:9,    color:0xB01430, ior:1.77, transparent:true,  labGrown:false, treatment:'Heated' },
  { id:'eme', name:'Emerald',    variety:'Colombian',       rate:1500, exponent:1.50, mohs:7.5,  color:0x0E7A4A, ior:1.58, transparent:true,  labGrown:false, treatment:'Oiled', care:'Never ultrasonic. Cleaning strips the oiling.' },
  { id:'aqu', name:'Aquamarine', variety:'Santa Maria',     rate:320,  exponent:1.25, mohs:7.75, color:0x9FD4DE, ior:1.58, transparent:true,  labGrown:false },
  { id:'mor', name:'Morganite',  variety:'Peach',           rate:130,  exponent:1.10, mohs:7.75, color:0xE8A894, ior:1.58, transparent:true,  labGrown:false },
  { id:'tan', name:'Tanzanite',  variety:'Violet-blue',     rate:600,  exponent:1.35, mohs:6.5,  color:0x5B4BC4, ior:1.69, transparent:true,  labGrown:false, treatment:'Heated', care:'Cleaves easily. Avoid knocks and thermal shock.' },
  { id:'ame', name:'Amethyst',   variety:'Siberian',        rate:45,   exponent:1.05, mohs:7,    color:0x7B4FBF, ior:1.54, transparent:true,  labGrown:false },
  { id:'opa', name:'Opal',       variety:'Australian',      rate:350,  exponent:1.20, mohs:5.5,  color:0xCFE7E0, ior:1.45, transparent:false, labGrown:false, care:'Dehydrates and crazes. Never ultrasonic.' },
  { id:'pea', name:'Pearl',      variety:'Akoya',           rate:200,  exponent:1.00, mohs:2.75, color:0xF2EDE4, ior:1.53, transparent:false, labGrown:false, care:'Dissolved by acid and perfume. Set last, never in a daily ring.' }
]

export const stoneById = (id: string): StoneType => STONES.find(s => s.id === id) ?? STONES[0]
