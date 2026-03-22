import { create } from 'zustand'
import {
  type PaneNode,
  createLeaf,
  getAllLeaves,
  replacePane,
  removePane,
  createSplit,
} from '../types/pane'
import type { SplitDirection } from '../types/pane'
import { useSessionsStore } from './sessions.store'

function cleanupPaneSessions(paneIds: string[]) {
  const { sessions, removeSession } = useSessionsStore.getState()
  for (const session of sessions.values()) {
    if (paneIds.includes(session.paneId)) removeSession(session.id)
  }
}

export interface Tab {
  id: string
  name: string
  root: PaneNode | null
  activePaneId: string | null
  paneCount: number
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
  minimizedPanes: Set<string>
  createTab: (name?: string) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, name: string) => void

  initTabRoot: (tabId: string, sessionId: string) => string
  splitTabPane: (tabId: string, paneId: string, dir: SplitDirection, sessionId: string) => string
  splitMdPane: (tabId: string, paneId: string, dir: SplitDirection, cwd: string) => string
  closeTabPane: (tabId: string, paneId: string) => void
  setTabActivePane: (tabId: string, paneId: string) => void
  updateTabRatio: (tabId: string, splitId: string, ratio: number) => void
  getTabPaneIds: (tabId: string) => string[]
  toggleMinimizePane: (paneId: string) => void
  restoreTabRoot: (tabId: string, root: PaneNode, activePaneId: string | null) => void
}

function mapTab(state: TabsState, tabId: string, fn: (t: Tab) => Tab): Partial<TabsState> {
  return { tabs: state.tabs.map((t) => (t.id === tabId ? fn(t) : t)) }
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  minimizedPanes: new Set(),

  createTab: (name) => {
    const id = crypto.randomUUID().slice(0, 8)
    const n = get().tabs.length + 1
    const tab: Tab = {
      id,
      name: name ?? `Shell ${n}`,
      root: null,
      activePaneId: null,
      paneCount: 0,
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: id }))
    return id
  },

  closeTab: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (tab?.root) cleanupPaneSessions(getAllLeaves(tab.root).map((l) => l.id))
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== tabId)
      const activeTabId =
        s.activeTabId === tabId ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
      return { tabs, activeTabId }
    })
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  renameTab: (tabId, name) =>
    set((s) => mapTab(s, tabId, (t) => ({ ...t, name }))),

  initTabRoot: (tabId, sessionId) => {
    const leaf = createLeaf(sessionId)
    set((s) => mapTab(s, tabId, (t) => ({ ...t, root: leaf, activePaneId: leaf.id, paneCount: 1 })))
    return leaf.id
  },

  splitTabPane: (tabId, paneId, dir, sessionId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab?.root || tab.paneCount >= 8) return ''
    const existing = getAllLeaves(tab.root).find((l) => l.id === paneId)
    if (!existing) return ''
    const newLeaf = createLeaf(sessionId)
    const newSplit = createSplit(dir, existing, newLeaf)
    const newRoot = replacePane(tab.root, paneId, newSplit)
    set((s) =>
      mapTab(s, tabId, (t) => ({
        ...t,
        root: newRoot,
        activePaneId: newLeaf.id,
        paneCount: t.paneCount + 1,
      }))
    )
    return newLeaf.id
  },

  splitMdPane: (tabId, paneId, dir, cwd) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab?.root || tab.paneCount >= 8) return ''
    const existing = getAllLeaves(tab.root).find((l) => l.id === paneId)
    if (!existing) return ''
    const newMd: PaneNode = { type: 'md', id: crypto.randomUUID(), cwd }
    const newSplit = createSplit(dir, existing, newMd)
    const newRoot = replacePane(tab.root, paneId, newSplit)
    set((s) =>
      mapTab(s, tabId, (t) => ({
        ...t,
        root: newRoot,
        activePaneId: newMd.id,
        paneCount: t.paneCount + 1,
      }))
    )
    return newMd.id
  },

  closeTabPane: (tabId, paneId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab?.root || tab.paneCount <= 1) return
    const newRoot = removePane(tab.root, paneId)
    if (!newRoot) return
    cleanupPaneSessions([paneId])
    const leaves = getAllLeaves(newRoot)
    const newActive = tab.activePaneId === paneId ? (leaves[0]?.id ?? null) : tab.activePaneId
    set((s) => {
      const minimizedPanes = new Set(s.minimizedPanes)
      minimizedPanes.delete(paneId)
      return {
        ...mapTab(s, tabId, (t) => ({
          ...t,
          root: newRoot,
          activePaneId: newActive,
          paneCount: t.paneCount - 1,
        })),
        minimizedPanes,
      }
    })
  },

  toggleMinimizePane: (paneId) =>
    set((s) => {
      const minimizedPanes = new Set(s.minimizedPanes)
      if (minimizedPanes.has(paneId)) minimizedPanes.delete(paneId)
      else minimizedPanes.add(paneId)
      return { minimizedPanes }
    }),

  setTabActivePane: (tabId, paneId) =>
    set((s) => mapTab(s, tabId, (t) => ({ ...t, activePaneId: paneId }))),

  updateTabRatio: (tabId, splitId, ratio) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab?.root) return
    const r = Math.max(0.15, Math.min(0.85, ratio))
    function update(node: PaneNode): PaneNode {
      if (node.type === 'split' && node.id === splitId) return { ...node, ratio: r }
      if (node.type === 'split') return { ...node, a: update(node.a), b: update(node.b) }
      return node
    }
    set((s) => mapTab(s, tabId, (t) => ({ ...t, root: update(t.root!) })))
  },

  getTabPaneIds: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab?.root) return []
    return getAllLeaves(tab.root).map((l) => l.id)
  },

  restoreTabRoot: (tabId, root, activePaneId) => {
    const leaves = getAllLeaves(root)
    set((s) =>
      mapTab(s, tabId, (t) => ({
        ...t,
        root,
        activePaneId: activePaneId ?? leaves[0]?.id ?? null,
        paneCount: leaves.length,
      }))
    )
  },
}))
