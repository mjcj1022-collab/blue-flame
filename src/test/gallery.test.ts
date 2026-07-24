import { describe, it, expect, beforeEach } from 'vitest'

// jsdom isn't configured, so provide a minimal in-memory localStorage.
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)) },
    removeItem: (k: string) => { mem.delete(k) },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() { return mem.size },
  } as Storage
}

import { gallery } from '../lib/gallery'
import { DEFAULT_SPEC } from '../spec/types'

// With no VITE_API_URL configured in tests, the store falls back to localStorage.

beforeEach(() => { localStorage.clear() })

const img = 'data:image/jpeg;base64,AAAA'

describe('gallery store (standalone / localStorage)', () => {
  it('is not backend-backed without an API url', () => {
    expect(gallery.backed()).toBe(false)
  })

  it('adds an item and lists it back with its spec preserved', async () => {
    const created = await gallery.add({ title: 'Solitaire', subtitle: '1.5 ct', image: img, spec: DEFAULT_SPEC })
    expect(created.id).toBeTruthy()
    const items = await gallery.list()
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Solitaire')
    expect(items[0].subtitle).toBe('1.5 ct')
    expect(items[0].spec?.category).toBe(DEFAULT_SPEC.category)
  })

  it('lists newest first', async () => {
    await gallery.add({ title: 'First', image: img })
    await gallery.add({ title: 'Second', image: img })
    const items = await gallery.list()
    expect(items.map(i => i.title)).toEqual(['Second', 'First'])
  })

  it('removes an item by id', async () => {
    const a = await gallery.add({ title: 'Keep', image: img })
    const b = await gallery.add({ title: 'Drop', image: img })
    await gallery.remove(b.id)
    const items = await gallery.list()
    expect(items.map(i => i.title)).toEqual(['Keep'])
    expect(items.find(i => i.id === a.id)).toBeTruthy()
  })

  it('defaults subtitle and spec to null when omitted', async () => {
    await gallery.add({ title: 'Bare', image: img })
    const [it] = await gallery.list()
    expect(it.subtitle).toBeNull()
    expect(it.spec).toBeNull()
  })
})
