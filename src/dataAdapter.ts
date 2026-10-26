import { initialData } from './data'
import { isAppData, type AppData } from './types'

export interface DataAdapter {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}

const STORAGE_KEY = 'erase-urt-data-v1'

export const localStorageAdapter: DataAdapter = {
  async load() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return initialData
    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object' || !('products' in parsed) || !Array.isArray(parsed.products) || !('categories' in parsed) || !Array.isArray(parsed.categories)) {
      throw new Error('Saved site data is invalid.')
    }
    const storedSettings = 'settings' in parsed && parsed.settings && typeof parsed.settings === 'object'
      ? parsed.settings
      : {}
    const merged = { ...initialData, ...(parsed as Partial<AppData>), settings: { ...initialData.settings, ...storedSettings } }
    if (!isAppData(merged)) throw new Error('Saved site data is incomplete or invalid.')
    return merged
  },
  async save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  },
}
