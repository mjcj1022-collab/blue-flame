import { describe, it, expect } from 'vitest'
import { ORDER_STAGES, stageIndex, stageLabel, stageKey } from '../lib/orderStages'

describe('order stage vocabulary (shared server ⇄ UI)', () => {
  it('maps a server key to its index and label', () => {
    expect(stageIndex('designed')).toBe(0)
    expect(stageIndex('shipped')).toBe(ORDER_STAGES.length - 1)
    expect(stageLabel('approved')).toBe('Approved')
    expect(stageLabel('qc')).toBe('QC')
  })

  it('falls back to the first stage for an unknown key, never crashing', () => {
    expect(stageIndex('gibberish')).toBe(0)
    expect(stageLabel('')).toBe('Designed')
  })

  it('maps a UI index back to the server key, clamped to range', () => {
    expect(stageKey(0)).toBe('designed')
    expect(stageKey(6)).toBe('shipped')
    expect(stageKey(-5)).toBe('designed')
    expect(stageKey(99)).toBe('shipped')
  })

  it('round-trips key → index → key for every stage', () => {
    for (const s of ORDER_STAGES) expect(stageKey(stageIndex(s.key))).toBe(s.key)
  })

  it('keys are lowercase (the server stores them verbatim)', () => {
    for (const s of ORDER_STAGES) expect(s.key).toBe(s.key.toLowerCase())
  })
})
