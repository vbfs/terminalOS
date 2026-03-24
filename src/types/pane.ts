export type SplitDirection = 'h' | 'v'

export type PaneNode =
  | { type: 'leaf'; id: string; sessionId: string }
  | { type: 'md'; id: string; cwd: string }
  | { type: 'split'; id: string; direction: SplitDirection; ratio: number; a: PaneNode; b: PaneNode }

export type LeafLike = Extract<PaneNode, { type: 'leaf' | 'md' }>

export interface PaneState {
  root: PaneNode
  activePaneId: string
  paneCount: number
}

export function createLeaf(sessionId: string): PaneNode {
  return { type: 'leaf', id: crypto.randomUUID(), sessionId }
}

export function createSplit(
  direction: SplitDirection,
  a: PaneNode,
  b: PaneNode,
  ratio = 0.5
): PaneNode {
  return { type: 'split', id: crypto.randomUUID(), direction, ratio, a, b }
}

export function findPane(root: PaneNode, paneId: string): PaneNode | null {
  if (root.id === paneId) return root
  if (root.type === 'split') {
    return findPane(root.a, paneId) ?? findPane(root.b, paneId)
  }
  return null
}

export function getAllLeaves(root: PaneNode): LeafLike[] {
  if (root.type === 'leaf' || root.type === 'md') return [root]
  return [...getAllLeaves(root.a), ...getAllLeaves(root.b)]
}

export function replacePane(root: PaneNode, paneId: string, replacement: PaneNode): PaneNode {
  if (root.id === paneId) return replacement
  if (root.type === 'split') {
    return {
      ...root,
      a: replacePane(root.a, paneId, replacement),
      b: replacePane(root.b, paneId, replacement),
    }
  }
  return root
}

export function removePane(root: PaneNode, paneId: string): PaneNode | null {
  if (root.id === paneId) return null
  if (root.type === 'split') {
    const newA = removePane(root.a, paneId)
    const newB = removePane(root.b, paneId)
    if (newA === null) return newB
    if (newB === null) return newA
    return { ...root, a: newA, b: newB }
  }
  return root
}
