/**
 * The production pipeline, shared so the server stage string and the UI never
 * drift. The server stores a lowercase key; the UI shows the label.
 */
export const ORDER_STAGES = [
  { key: 'designed', label: 'Designed' },
  { key: 'approved', label: 'Approved' },
  { key: 'cast', label: 'Cast' },
  { key: 'set', label: 'Set' },
  { key: 'finished', label: 'Finished' },
  { key: 'qc', label: 'QC' },
  { key: 'shipped', label: 'Shipped' },
] as const

export type OrderStageKey = typeof ORDER_STAGES[number]['key']

/** Index of a stage key, clamped to 0 for anything unrecognised. */
export function stageIndex(key: string): number {
  const i = ORDER_STAGES.findIndex(s => s.key === key)
  return i < 0 ? 0 : i
}

export const stageLabel = (key: string): string => ORDER_STAGES[stageIndex(key)].label
export const stageKey = (index: number): OrderStageKey =>
  ORDER_STAGES[Math.max(0, Math.min(index, ORDER_STAGES.length - 1))].key
