import React from 'react'
import styles from './PaneGrid.module.css'
import { TermPane } from '../TermPane/TermPane'
import { useTabsStore } from '../../store/tabs.store'
import type { PaneNode, SplitDirection } from '../../types/pane'

interface PaneGridProps {
  tabId: string
  onSplit: (tabId: string, paneId: string, dir: SplitDirection) => void
  onClose: (tabId: string, paneId: string) => void
}

interface NodeRendererProps {
  node: PaneNode
  tabId: string
  activePaneId: string | null
  paneCount: number
  onSplit: (paneId: string, dir: SplitDirection) => void
  onClose: (paneId: string) => void
  onFocus: (paneId: string) => void
}

const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  tabId,
  activePaneId,
  paneCount,
  onSplit,
  onClose,
  onFocus,
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
      />
    )
  }

  const isHorizontal = node.direction === 'h'

  return (
    <div
      className={`${styles.splitContainer} ${isHorizontal ? styles.horizontal : styles.vertical}`}
    >
      <div style={{ flex: node.ratio }} className={styles.splitChild}>
        <NodeRenderer
          node={node.a}
          tabId={tabId}
          activePaneId={activePaneId}
          paneCount={paneCount}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
        />
      </div>
      <div className={`${styles.divider} ${isHorizontal ? styles.dividerH : styles.dividerV}`} />
      <div style={{ flex: 1 - node.ratio }} className={styles.splitChild}>
        <NodeRenderer
          node={node.b}
          tabId={tabId}
          activePaneId={activePaneId}
          paneCount={paneCount}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
        />
      </div>
    </div>
  )
}

export const PaneGrid: React.FC<PaneGridProps> = ({ tabId, onSplit, onClose }) => {
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
      />
    </div>
  )
}
