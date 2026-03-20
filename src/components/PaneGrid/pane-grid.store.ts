import { create } from 'zustand'
import {
  PaneNode,
  createLeaf,
  createSplit,
  getAllLeaves,
  replacePane,
  removePane,
  SplitDirection,
} from '../../types/pane'

interface PaneGridState {
  root: PaneNode | null
  activePaneId: string | null
  paneCount: number

  initRoot: (sessionId: string) => string
  splitPane: (paneId: string, direction: SplitDirection, sessionId: string) => string
  closePane: (paneId: string) => void
  setActivePane: (paneId: string) => void
  focusPrevPane: () => void
  focusNextPane: () => void
  focusPaneAtIndex: (index: number) => void
  updateRatio: (splitId: string, ratio: number) => void
  getPaneIds: () => string[]
}

export const usePaneGridStore = create<PaneGridState>((set, get) => ({
  root: null,
  activePaneId: null,
  paneCount: 0,

  initRoot: (sessionId) => {
    const leaf = createLeaf(sessionId)
    set({ root: leaf, activePaneId: leaf.id, paneCount: 1 })
    return leaf.id
  },

  splitPane: (paneId, direction, sessionId) => {
    const { root } = get()
    if (!root) return ''
    if (get().paneCount >= 8) {
      console.warn('Max 8 panes reached')
      return ''
    }

    const existingLeaf = getAllLeaves(root).find((l) => l.id === paneId)
    if (!existingLeaf) return ''

    const newLeaf = createLeaf(sessionId)
    const newSplit = createSplit(direction, existingLeaf, newLeaf)
    const newRoot = replacePane(root, paneId, newSplit)

    set({
      root: newRoot,
      activePaneId: newLeaf.id,
      paneCount: get().paneCount + 1,
    })

    return newLeaf.id
  },

  closePane: (paneId) => {
    const { root, activePaneId, paneCount } = get()
    if (!root || paneCount <= 1) return

    const newRoot = removePane(root, paneId)
    if (!newRoot) return

    const leaves = getAllLeaves(newRoot)
    const newActive =
      activePaneId === paneId
        ? leaves[0]?.id ?? null
        : activePaneId

    set({
      root: newRoot,
      activePaneId: newActive,
      paneCount: paneCount - 1,
    })
  },

  setActivePane: (paneId) => set({ activePaneId: paneId }),

  focusPrevPane: () => {
    const { root, activePaneId } = get()
    if (!root || !activePaneId) return
    const leaves = getAllLeaves(root)
    const idx = leaves.findIndex((l) => l.id === activePaneId)
    const prev = leaves[(idx - 1 + leaves.length) % leaves.length]
    if (prev) set({ activePaneId: prev.id })
  },

  focusNextPane: () => {
    const { root, activePaneId } = get()
    if (!root || !activePaneId) return
    const leaves = getAllLeaves(root)
    const idx = leaves.findIndex((l) => l.id === activePaneId)
    const next = leaves[(idx + 1) % leaves.length]
    if (next) set({ activePaneId: next.id })
  },

  focusPaneAtIndex: (index) => {
    const { root } = get()
    if (!root) return
    const leaves = getAllLeaves(root)
    const leaf = leaves[index]
    if (leaf) set({ activePaneId: leaf.id })
  },

  updateRatio: (splitId, ratio) => {
    const { root } = get()
    if (!root) return
    const clampedRatio = Math.max(0.15, Math.min(0.85, ratio))

    function update(node: PaneNode): PaneNode {
      if (node.type === 'split' && node.id === splitId) {
        return { ...node, ratio: clampedRatio }
      }
      if (node.type === 'split') {
        return { ...node, a: update(node.a), b: update(node.b) }
      }
      return node
    }

    set({ root: update(root) })
  },

  getPaneIds: () => {
    const { root } = get()
    if (!root) return []
    return getAllLeaves(root).map((l) => l.id)
  },
}))
