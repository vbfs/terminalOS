import React, { useRef } from 'react'
import styles from './PaneGrid.module.css'
import { SplitHandle } from './SplitHandle'
import { TermPane } from '../TermPane/TermPane'
import type { PaneNode } from '../../types/pane'
import { useTabsStore } from '../../store/tabs.store'

interface PaneNodeRendererProps {
  node: PaneNode
  tabId: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

const PaneNodeRenderer: React.FC<PaneNodeRendererProps> = ({ node, tabId, containerRef }) => {
  if (node.type === 'leaf') {
    return <TermPane paneId={node.id} sessionId={node.sessionId} tabId={tabId} />
  }

  const isHorizontal = node.direction === 'h'
  const aStyle = isHorizontal
    ? { width: `${node.ratio * 100}%` }
    : { height: `${node.ratio * 100}%` }
  const bStyle = isHorizontal
    ? { width: `${(1 - node.ratio) * 100}%` }
    : { height: `${(1 - node.ratio) * 100}%` }

  return (
    <div
      className={`${styles.split} ${
        isHorizontal ? styles.splitH : styles.splitV
      }`}
    >
      <div style={aStyle} className={styles.splitChild}>
        <PaneNodeRenderer node={node.a} tabId={tabId} containerRef={containerRef} />
      </div>
      <SplitHandle
        splitId={node.id}
        tabId={tabId}
        direction={node.direction}
        containerRef={containerRef}
        currentRatio={node.ratio}
      />
      <div style={bStyle} className={styles.splitChild}>
        <PaneNodeRenderer node={node.b} tabId={tabId} containerRef={containerRef} />
      </div>
    </div>
  )
}

interface PaneGridProps {
  tabId: string
  isActive: boolean
}

export const PaneGrid: React.FC<PaneGridProps> = ({ tabId, isActive }) => {
  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId))
  const containerRef = useRef<HTMLDivElement>(null)

  const root = tab?.root ?? null

  return (
    <div
      ref={containerRef}
      className={styles.paneGrid}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {root ? (
        <PaneNodeRenderer node={root} tabId={tabId} containerRef={containerRef} />
      ) : (
        <div className={styles.empty}>
          <span>Initializing…</span>
        </div>
      )}
    </div>
  )
}
