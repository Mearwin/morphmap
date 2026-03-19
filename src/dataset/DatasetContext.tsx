import { createContext, useContext, type ReactNode } from 'react'
import type { DatasetConfig } from './DatasetConfig'

const DatasetContext = createContext<DatasetConfig | null>(null)

export function DatasetProvider({ config, children }: { config: DatasetConfig; children: ReactNode }) {
  return <DatasetContext.Provider value={config}>{children}</DatasetContext.Provider>
}

export function useDataset(): DatasetConfig {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider')
  return ctx
}
