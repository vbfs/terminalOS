import { api } from "../api";
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
  versionCount: number
  currentVersion: number
  lastVersionAt: number
}

interface MdPaneStoreState {
  panes: Map<string, MdPane>
  init: (paneId: string, cwd: string) => Promise<void>
  destroy: (paneId: string) => void
  browse: (paneId: string, dirPath: string) => Promise<void>
  openFile: (paneId: string, filePath: string) => Promise<void>
  closeFile: (paneId: string) => void
  setContent: (paneId: string, content: string) => void
  save: (paneId: string, isManual?: boolean) => Promise<void>
  newFile: (paneId: string, name: string) => Promise<void>
  newDir: (paneId: string, name: string) => Promise<void>
  goUp: (paneId: string) => Promise<void>
  moveEntry: (paneId: string, srcPath: string, destDir: string) => Promise<void>
  copyExternal: (paneId: string, srcPaths: string[], destDir: string) => Promise<void>
  deleteEntry: (paneId: string, entryPath: string) => Promise<void>
  renameEntry: (paneId: string, entryPath: string, newName: string) => Promise<void>
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
        versionCount: 0,
        currentVersion: 0,
        lastVersionAt: 0,
      })
      return { panes: next }
    })

    try {
      const entries = await api.fs.readDir(browsePath)
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
      const entries = await api.fs.readDir(dirPath)
      set((s) => ({ panes: patchPane(s.panes, paneId, { entries, isLoading: false }) }))
    } catch {
      set((s) => ({ panes: patchPane(s.panes, paneId, { isLoading: false }) }))
    }
  },

  openFile: async (paneId, filePath) => {
    set((s) => ({ panes: patchPane(s.panes, paneId, { isLoading: true }) }))
    try {
      const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.mdx')
      const [content, versions] = await Promise.all([
        api.fs.readFile(filePath),
        isMarkdown ? api.fs.versions.list(filePath) : Promise.resolve([]),
      ])
      const versionCount = versions.length
      const currentVersion = versionCount > 0 ? versions[0].version : 0
      set((s) => ({
        panes: patchPane(s.panes, paneId, {
          filePath,
          content,
          savedContent: content,
          isLoading: false,
          view: 'editor',
          versionCount,
          currentVersion,
          lastVersionAt: versionCount > 0 ? versions[0].timestamp : 0,
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
        versionCount: 0,
        currentVersion: 0,
        lastVersionAt: 0,
      }),
    }))
  },

  setContent: (paneId, content) => {
    set((s) => ({ panes: patchPane(s.panes, paneId, { content }) }))
  },

  save: async (paneId, isManual = false) => {
    const pane = get().panes.get(paneId)
    if (!pane?.filePath) return
    await api.fs.writeFile(pane.filePath, pane.content)
    set((s) => ({ panes: patchPane(s.panes, paneId, { savedContent: pane.content }) }))

    // Only version .md files
    const isMarkdown = pane.filePath.endsWith('.md') || pane.filePath.endsWith('.mdx')
    if (!isMarkdown) return

    // Throttle: create version on manual save always, or if >2 min since last version
    const now = Date.now()
    const TWO_MINUTES = 2 * 60 * 1000
    if (!isManual && pane.lastVersionAt > 0 && now - pane.lastVersionAt < TWO_MINUTES) return

    const meta = await api.fs.versions.save(pane.filePath, pane.content)
    if (meta) {
      set((s) => ({
        panes: patchPane(s.panes, paneId, {
          versionCount: s.panes.get(paneId)!.versionCount + 1,
          currentVersion: meta.version,
          lastVersionAt: meta.timestamp,
        }),
      }))
    }
  },

  newFile: async (paneId, name) => {
    const pane = get().panes.get(paneId)
    if (!pane) return
    const filePath = pane.browsePath + '/' + name
    await api.fs.writeFile(filePath, '')
    await get().browse(paneId, pane.browsePath)
  },

  newDir: async (paneId, name) => {
    const pane = get().panes.get(paneId)
    if (!pane) return
    const dirPath = pane.browsePath + '/' + name
    await api.fs.mkdir(dirPath)
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
    await api.fs.rename(srcPath, dest)
    const pane = get().panes.get(paneId)
    if (pane) await get().browse(paneId, pane.browsePath)
  },

  copyExternal: async (paneId, srcPaths, destDir) => {
    for (const src of srcPaths) {
      await api.fs.copyExternal(src, destDir)
    }
    const pane = get().panes.get(paneId)
    if (pane) await get().browse(paneId, pane.browsePath)
  },

  deleteEntry: async (paneId, entryPath) => {
    await api.fs.delete(entryPath)
    const pane = get().panes.get(paneId)
    if (!pane) return
    if (pane.filePath === entryPath) {
      get().closeFile(paneId)
    }
    await get().browse(paneId, pane.browsePath)
  },

  renameEntry: async (paneId, entryPath, newName) => {
    const dir = entryPath.split('/').slice(0, -1).join('/')
    const dest = dir + '/' + newName
    await api.fs.rename(entryPath, dest)
    const pane = get().panes.get(paneId)
    if (!pane) return
    if (pane.filePath === entryPath) {
      set((s) => ({ panes: patchPane(s.panes, paneId, { filePath: dest }) }))
    }
    await get().browse(paneId, pane.browsePath)
  },
}))
