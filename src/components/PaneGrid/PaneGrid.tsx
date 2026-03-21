import React from 'react'
import styles from './PaneGrid.module.css'
import { TermPane } from '../TermPane/TermPane'
import { MarkdownPane } from '../MarkdownPane/MarkdownPane'
import { useTabsStore } from '../../store/tabs.store'
import type { PaneNode, SplitDirection } from '../../types/pane'

interface PaneGridProps {
  tabId: string
  onSplit: (tabId: string, paneId: string, dir: SplitDirection) => void
  onClose: (tabId: string, paneId: string) => void
  onOpenMd: (tabId: string, paneId: string) => void
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
}

const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  tabId,
  activePaneId,
  paneCount,
  onSplit,
  onClose,
  onFocus,
  onOpenMd,
}) => {
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

  const isHorizontal = node.direction === 'h'
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const minimizedPanes = useTabsStore((s) => s.minimizedPanes)

  const isLeaf = (n: PaneNode) => n.type === 'leaf' || n.type === 'md'
  const aMin = isLeaf(node.a) && minimizedPanes.has(node.a.id)
  const bMin = isLeaf(node.b) && minimizedPanes.has(node.b.id)

  // Minimized sizes: thin strip in each axis direction
  const MIN_W = 36   // px – horizontal minimize: narrow strip
  const MIN_H = 34   // px – vertical minimize: just the header

  let aStyle: React.CSSProperties
  let bStyle: React.CSSProperties

  if (aMin) {
    aStyle = isHorizontal
      ? { flex: 'none', width: MIN_W, minWidth: MIN_W, maxWidth: MIN_W, overflow: 'hidden' }
      : { flex: 'none', height: MIN_H, minHeight: MIN_H, maxHeight: MIN_H, overflow: 'hidden' }
    bStyle = { flex: 1 }
  } else if (bMin) {
    aStyle = { flex: 1 }
    bStyle = isHorizontal
      ? { flex: 'none', width: MIN_W, minWidth: MIN_W, maxWidth: MIN_W, overflow: 'hidden' }
      : { flex: 'none', height: MIN_H, minHeight: MIN_H, maxHeight: MIN_H, overflow: 'hidden' }
  } else {
    aStyle = { flex: node.ratio }
    bStyle = { flex: 1 - node.ratio }
  }

  return (
    <div
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
        />
      </div>
      <div className={`${styles.divider} ${isHorizontal ? styles.dividerH : styles.dividerV}`} />
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
        />
      </div>
    </div>
  )
}

export const PaneGrid: React.FC<PaneGridProps> = ({ tabId, onSplit, onClose, onOpenMd }) => {
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
      />
    </div>
  )
}
