import React, { useRef, useCallback } from 'react'
import styles from './PaneGrid.module.css'
import { TermPane } from '../TermPane/TermPane'
import { MarkdownPane } from '../MarkdownPane/MarkdownPane'
import { useTabsStore } from '../../store/tabs.store'
import type { PaneNode, SplitDirection } from '../../types/pane'

// ── Helpers ────────────────────────────────────────────────────

const MIN_W = 36   // px – horizontal minimize: narrow strip
const MIN_H = 34   // px – vertical minimize: just the header

function isSubtreeMinimized(node: PaneNode, set: Set<string>): boolean {
  if (node.type === 'leaf' || node.type === 'md') return set.has(node.id)
  return isSubtreeMinimized(node.a, set) && isSubtreeMinimized(node.b, set)
}

function countLeaves(node: PaneNode): number {
  if (node.type === 'leaf' || node.type === 'md') return 1
  return countLeaves(node.a) + countLeaves(node.b)
}

/** Total collapsed px a fully-minimized subtree needs in parent direction */
function collapsedPx(node: PaneNode, parentIsHorizontal: boolean): number {
  const n = countLeaves(node)
  // n leaves, n-1 dividers (1px each)
  return parentIsHorizontal ? n * MIN_W + (n - 1) : n * MIN_H + (n - 1)
}

// ── Props ──────────────────────────────────────────────────────

interface PaneGridProps {
  tabId: string
  onSplit: (tabId: string, paneId: string, dir: SplitDirection) => void
  onClose: (tabId: string, paneId: string) => void
  onOpenMd: (tabId: string, paneId: string) => void
  onCommandPalette?: () => void
  onNewTab?: () => void
}

interface NodeRendererProps {
  node: PaneNode
  tabId: string
  activePaneId: string | null
  paneCount: number
  onSplit: (paneId: string, dir: SplitDirection) => void
  onClose: (paneId: string) => void
  onFocus: (paneId: string) => void
  onOpenMd: (paneId: string) => void
  onCommandPalette?: () => void
  onNewTab?: () => void
}

// ── NodeRenderer ───────────────────────────────────────────────

const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  tabId,
  activePaneId,
  paneCount,
  onSplit,
  onClose,
  onFocus,
  onOpenMd,
  onCommandPalette,
  onNewTab,
}) => {
  // All hooks must be unconditional — before any early returns
  const minimizedPanes = useTabsStore((s) => s.minimizedPanes)
  const updateTabRatio = useTabsStore((s) => s.updateTabRatio)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (node.type !== 'split') return
      e.preventDefault()

      const isH = node.direction === 'h'
      const splitId = node.id
      draggingRef.current = true

      const onMove = (ev: MouseEvent) => {
        if (!draggingRef.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const ratio = isH
          ? (ev.clientX - rect.left) / rect.width
          : (ev.clientY - rect.top) / rect.height
        updateTabRatio(tabId, splitId, ratio)
      }

      const onUp = () => {
        draggingRef.current = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = isH ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [node, tabId, updateTabRatio],
  )

  if (node.type === 'leaf') {
    return (
      <TermPane
        sessionId={node.sessionId}
        paneId={node.id}
        isActive={activePaneId === node.id}
        canClose={paneCount > 1}
        onSplit={onSplit}
        onClose={onClose}
        onFocus={onFocus}
        onOpenMd={onOpenMd}
        onCommandPalette={onCommandPalette}
        onNewTab={onNewTab}
      />
    )
  }

  if (node.type === 'md') {
    return (
      <MarkdownPane
        paneId={node.id}
        cwd={node.cwd}
        isActive={activePaneId === node.id}
        canClose={paneCount > 1}
        onClose={onClose}
        onFocus={onFocus}
      />
    )
  }

  // Split node
  const isHorizontal = node.direction === 'h'
  const aMin = isSubtreeMinimized(node.a, minimizedPanes)
  const bMin = isSubtreeMinimized(node.b, minimizedPanes)

  let aStyle: React.CSSProperties
  let bStyle: React.CSSProperties
  let containerStyle: React.CSSProperties = {}

  if (aMin && bMin) {
    // Both sides fully minimized — collapse container height and give children their sizes
    const n = countLeaves(node)
    const collapsedH = isHorizontal
      ? MIN_H                          // side-by-side: shared row = one header tall
      : n * MIN_H + (n - 1)            // stacked: sum of all headers + dividers
    containerStyle = { height: collapsedH }

    const aPx = collapsedPx(node.a, isHorizontal)
    const bPx = collapsedPx(node.b, isHorizontal)
    aStyle = isHorizontal
      ? { flex: 'none', width: aPx, minWidth: aPx, maxWidth: aPx, overflow: 'hidden' }
      : { flex: 'none', height: aPx, minHeight: aPx, maxHeight: aPx, overflow: 'hidden' }
    bStyle = isHorizontal
      ? { flex: 'none', width: bPx, minWidth: bPx, maxWidth: bPx, overflow: 'hidden' }
      : { flex: 'none', height: bPx, minHeight: bPx, maxHeight: bPx, overflow: 'hidden' }
  } else if (aMin) {
    const px = collapsedPx(node.a, isHorizontal)
    aStyle = isHorizontal
      ? { flex: 'none', width: px, minWidth: px, maxWidth: px, overflow: 'hidden' }
      : { flex: 'none', height: px, minHeight: px, maxHeight: px, overflow: 'hidden' }
    bStyle = { flex: 1 }
  } else if (bMin) {
    const px = collapsedPx(node.b, isHorizontal)
    aStyle = { flex: 1 }
    bStyle = isHorizontal
      ? { flex: 'none', width: px, minWidth: px, maxWidth: px, overflow: 'hidden' }
      : { flex: 'none', height: px, minHeight: px, maxHeight: px, overflow: 'hidden' }
  } else {
    aStyle = { flex: node.ratio }
    bStyle = { flex: 1 - node.ratio }
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`${styles.splitContainer} ${isHorizontal ? styles.horizontal : styles.vertical}`}
    >
      <div style={aStyle} className={styles.splitChild}>
        <NodeRenderer
          node={node.a}
          tabId={tabId}
          activePaneId={activePaneId}
          paneCount={paneCount}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          onOpenMd={onOpenMd}
          onCommandPalette={onCommandPalette}
          onNewTab={onNewTab}
        />
      </div>
      <div
        className={`${styles.divider} ${isHorizontal ? styles.dividerH : styles.dividerV}`}
        onMouseDown={handleDividerMouseDown}
      />
      <div style={bStyle} className={styles.splitChild}>
        <NodeRenderer
          node={node.b}
          tabId={tabId}
          activePaneId={activePaneId}
          paneCount={paneCount}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          onOpenMd={onOpenMd}
          onCommandPalette={onCommandPalette}
          onNewTab={onNewTab}
        />
      </div>
    </div>
  )
}

export const PaneGrid: React.FC<PaneGridProps> = ({ tabId, onSplit, onClose, onOpenMd, onCommandPalette, onNewTab }) => {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId))
  const setTabActivePane = useTabsStore((s) => s.setTabActivePane)

  if (!tab?.root) return null

  return (
    <div className={styles.paneGrid}>
      <NodeRenderer
        node={tab.root}
        tabId={tabId}
        activePaneId={tab.activePaneId}
        paneCount={tab.paneCount}
        onSplit={(paneId, dir) => onSplit(tabId, paneId, dir)}
        onClose={(paneId) => onClose(tabId, paneId)}
        onFocus={(paneId) => setTabActivePane(tabId, paneId)}
        onOpenMd={(paneId) => onOpenMd(tabId, paneId)}
        onCommandPalette={onCommandPalette}
        onNewTab={onNewTab}
      />
    </div>
  )
}
