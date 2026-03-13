'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Company {
  id: string
  name: string
  slug: string
  description?: string
  status: string
  identity?: string
  created_at: string
}

interface CompanyContextType {
  selectedCompany: Company | null
  setSelectedCompany: (company: Company | null) => void
  isScoped: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  return (
    <CompanyContext.Provider value={{
      selectedCompany,
      setSelectedCompany,
      isScoped: !!selectedCompany
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}
