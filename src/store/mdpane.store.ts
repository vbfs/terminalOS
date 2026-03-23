import { create } from 'zustand'

export interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  ext: string
  size?: number
}

export interface MdPane {
  cwd: string
  browsePath: string
  entries: FsEntry[]
  filePath: string | null
  content: string
  savedContent: string
  isLoading: boolean
  view: 'browser' | 'editor'
}

interface MdPaneStoreState {
  panes: Map<string, MdPane>
  init: (paneId: string, cwd: string) => Promise<void>
  destroy: (paneId: string) => void
  browse: (paneId: string, dirPath: string) => Promise<void>
  openFile: (paneId: string, filePath: string) => Promise<void>
  closeFile: (paneId: string) => void
  setContent: (paneId: string, content: string) => void
  save: (paneId: string) => Promise<void>
  newFile: (paneId: string, name: string) => Promise<void>
  newDir: (paneId: string, name: string) => Promise<void>
  goUp: (paneId: string) => Promise<void>
  moveEntry: (paneId: string, srcPath: string, destDir: string) => Promise<void>
}

function patchPane(
  panes: Map<string, MdPane>,
  paneId: string,
  patch: Partial<MdPane>
): Map<string, MdPane> {
  const current = panes.get(paneId)
  if (!current) return panes
  const next = new Map(panes)
  next.set(paneId, { ...current, ...patch })
  return next
}

export const useMdPaneStore = create<MdPaneStoreState>((set, get) => ({
  panes: new Map(),

  init: async (paneId, cwd) => {
    const existing = get().panes.get(paneId)
    if (existing) return

    const browsePath = cwd || '/'
    set((s) => {
      const next = new Map(s.panes)
      next.set(paneId, {
        cwd: browsePath,
        browsePath,
        entries: [],
        filePath: null,
        content: '',
        savedContent: '',
        isLoading: true,
        view: 'browser',
      })
      return { panes: next }
    })

    try {
      const entries = await window.api.fs.readDir(browsePath)
      set((s) => ({ panes: patchPane(s.panes, paneId, { entries, isLoading: false }) }))
    } catch {
      set((s) => ({ panes: patchPane(s.panes, paneId, { isLoading: false }) }))
    }
  },

  destroy: (paneId) => {
    set((s) => {
      const next = new Map(s.panes)
      next.delete(paneId)
      return { panes: next }
    })
  },

  browse: async (paneId, dirPath) => {
    set((s) => ({ panes: patchPane(s.panes, paneId, { browsePath: dirPath, isLoading: true }) }))
    try {
      const entries = await window.api.fs.readDir(dirPath)
      set((s) => ({ panes: patchPane(s.panes, paneId, { entries, isLoading: false }) }))
    } catch {
      set((s) => ({ panes: patchPane(s.panes, paneId, { isLoading: false }) }))
    }
  },

  openFile: async (paneId, filePath) => {
    set((s) => ({ panes: patchPane(s.panes, paneId, { isLoading: true }) }))
    try {
      const content = await window.api.fs.readFile(filePath)
      set((s) => ({
        panes: patchPane(s.panes, paneId, {
          filePath,
          content,
          savedContent: content,
          isLoading: false,
          view: 'editor',
        }),
      }))
    } catch {
      set((s) => ({ panes: patchPane(s.panes, paneId, { isLoading: false }) }))
    }
  },

  closeFile: (paneId) => {
    set((s) => ({
      panes: patchPane(s.panes, paneId, {
        filePath: null,
        content: '',
        savedContent: '',
        view: 'browser',
      }),
    }))
  },

  setContent: (paneId, content) => {
    set((s) => ({ panes: patchPane(s.panes, paneId, { content }) }))
  },

  save: async (paneId) => {
    const pane = get().panes.get(paneId)
    if (!pane?.filePath) return
    await window.api.fs.writeFile(pane.filePath, pane.content)
    set((s) => ({ panes: patchPane(s.panes, paneId, { savedContent: pane.content }) }))
  },

  newFile: async (paneId, name) => {
    const pane = get().panes.get(paneId)
    if (!pane) return
    const filePath = pane.browsePath + '/' + name
    await window.api.fs.writeFile(filePath, '')
    await get().browse(paneId, pane.browsePath)
  },

  newDir: async (paneId, name) => {
    const pane = get().panes.get(paneId)
    if (!pane) return
    const dirPath = pane.browsePath + '/' + name
    await window.api.fs.mkdir(dirPath)
    await get().browse(paneId, pane.browsePath)
  },

  goUp: async (paneId) => {
    const pane = get().panes.get(paneId)
    if (!pane) return
    // Use simple string manipulation since path-browserify may not be available
    const parts = pane.browsePath.replace(/\/$/, '').split('/')
    if (parts.length <= 1) return
    parts.pop()
    const parent = parts.join('/') || '/'
    await get().browse(paneId, parent)
  },

  moveEntry: async (paneId, srcPath, destDir) => {
    const name = srcPath.split('/').pop()!
    const dest = destDir + '/' + name
    if (dest === srcPath) return
    await window.api.fs.rename(srcPath, dest)
    const pane = get().panes.get(paneId)
    if (pane) await get().browse(paneId, pane.browsePath)
  },
}))
