import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesState {
  themeId: string
  hasSeenWelcome: boolean
  setTheme: (id: string) => void
  setHasSeenWelcome: (seen: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeId: 'all-black',
      hasSeenWelcome: false,
      setTheme: (id) => set({ themeId: id }),
      setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),
    }),
    {
      name: 'preferences-store',
    }
  )
)
