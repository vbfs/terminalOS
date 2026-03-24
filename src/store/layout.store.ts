import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SavedNode =
  | { type: 'leaf'; id: string; cwd: string }
  | { type: 'md'; id: string; cwd: string }
  | { type: 'split'; id: string; direction: 'h' | 'v'; ratio: number; a: SavedNode; b: SavedNode }

export interface SavedTab {
  id: string
  name: string
  activePaneId: string | null
  paneCount: number
  root: SavedNode | null
}

interface LayoutState {
  activeTabIndex: number
  tabs: SavedTab[]
  saveLayout: (activeTabIndex: number, tabs: SavedTab[]) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      activeTabIndex: 0,
      tabs: [],
      saveLayout: (activeTabIndex, tabs) => set({ activeTabIndex, tabs }),
    }),
    { name: 'layout-store' }
  )
)
