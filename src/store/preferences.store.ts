import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesState {
  themeId: string
  setTheme: (id: string) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeId: 'aiterm-dark',
      setTheme: (id) => set({ themeId: id }),
    }),
    {
      name: 'preferences-store',
    }
  )
)
