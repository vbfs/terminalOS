import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
  rootFolder: string | null
  recentFolders: string[]
  gitBranch: string | null
  setRootFolder: (folder: string | null) => void
  addRecentFolder: (folder: string) => void
  setGitBranch: (branch: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      rootFolder: null,
      recentFolders: [],
      gitBranch: null,

      setRootFolder: (folder) => {
        set({ rootFolder: folder })
        if (folder) {
          get().addRecentFolder(folder)
          window.api.fs.setWatchRoot(folder)
          window.api.app.getGitBranch(folder).then((branch) => {
            set({ gitBranch: branch })
          })
        }
      },

      addRecentFolder: (folder) =>
        set((state) => ({
          recentFolders: [
            folder,
            ...state.recentFolders.filter((f) => f !== folder),
          ].slice(0, 10),
        })),

      setGitBranch: (branch) => set({ gitBranch: branch }),
    }),
    {
      name: 'workspace-store',
    }
  )
)
