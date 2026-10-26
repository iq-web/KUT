import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react'
import { initialData } from './data'
import { localStorageAdapter, type DataAdapter } from './dataAdapter'
import type { AppData } from './types'

type StoreValue = {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  isLoading: boolean
  storageError: string
  clearStorageError: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children, adapter = localStorageAdapter }: PropsWithChildren<{ adapter?: DataAdapter }>) {
  const [data, setDataState] = useState<AppData>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [canPersist, setCanPersist] = useState(false)
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    let active = true
    adapter.load().then(loadedData => {
      if (!active) return
      setDataState(loadedData)
      setCanPersist(true)
      setIsLoading(false)
    }).catch(error => {
      if (!active) return
      console.error('Unable to load local ERASE data', error)
      setStorageError('تعذر قراءة البيانات السابقة. لم يتم استبدالها؛ أصلحها أو استورد نسخة احتياطية من لوحة الإدارة.')
      setIsLoading(false)
    })
    return () => { active = false }
  }, [adapter])

  const setData = useCallback<Dispatch<SetStateAction<AppData>>>(updater => {
    setCanPersist(true)
    setDataState(updater)
  }, [])

  useEffect(() => {
    if (!canPersist || isLoading) return
    adapter.save(data).then(() => setStorageError('')).catch(error => {
      console.error('Unable to save local ERASE data', error)
      setStorageError('تعذر حفظ التغييرات في هذا الجهاز. تحقق من مساحة التخزين أو إعدادات المتصفح.')
    })
  }, [adapter, canPersist, data, isLoading])

  const value = useMemo(() => ({
    data,
    setData,
    isLoading,
    storageError,
    clearStorageError: () => setStorageError(''),
  }), [data, isLoading, setData, storageError])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within StoreProvider')
  return store
}
