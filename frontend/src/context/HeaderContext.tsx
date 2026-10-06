import React, { createContext, useContext, useState } from 'react'

interface HeaderContextType {
  portalNode: HTMLDivElement | null
  setPortalNode: (node: HTMLDivElement | null) => void
  hasExtra: boolean
  setHasExtra: (has: boolean) => void
}

export const HeaderContext = createContext<HeaderContextType>({
  portalNode: null,
  setPortalNode: () => {},
  hasExtra: false,
  setHasExtra: () => {},
})

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null)
  const [hasExtra, setHasExtra] = useState(false)

  return (
    <HeaderContext.Provider value={{ portalNode, setPortalNode, hasExtra, setHasExtra }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContext() {
  return useContext(HeaderContext)
}

