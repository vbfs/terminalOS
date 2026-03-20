import React from 'react'
import styles from './TermPane.module.css'
import { AIBadge } from './AIBadge'
import type { AIProcess } from '../../types/ipc'

interface PaneHeaderProps {
  paneId: string
  aiProcess: AIProcess | null
  cwd: string
  isActive: boolean
  canClose: boolean
  onSplitV: () => void
  onSplitH: () => void
  onClose: () => void
  onFocus: () => void
}

function shortCwd(cwd: string): string {
  const parts = cwd.replace(/^\/Users\/[^/]+/, '~').split('/')
  return parts.slice(-2).join('/')
}

export const PaneHeader: React.FC<PaneHeaderProps> = ({
  paneId,
  aiProcess,
  cwd,
  isActive,
  canClose,
  onSplitV,
  onSplitH,
  onClose,
  onFocus,
}) => {
  return (
    <div
      className={`${styles.paneHeader} ${isActive ? styles.active : ''}`}
      onClick={onFocus}
    >
      <div className={styles.paneHeaderLeft}>
        {aiProcess ? (
          <AIBadge name={aiProcess.name} color={aiProcess.color} />
        ) : (
          <span className={styles.shellLabel}>shell</span>
        )}
        <span className={styles.cwdLabel}>{shortCwd(cwd)}</span>
      </div>
      <div className={styles.paneHeaderActions}>
        <button
          className={styles.paneAction}
          onClick={(e) => { e.stopPropagation(); onSplitH() }}
          title="Split Horizontally"
        >
          &#x229E;
        </button>
        <button
          className={styles.paneAction}
          onClick={(e) => { e.stopPropagation(); onSplitV() }}
          title="Split Vertically"
        >
          &#x229F;
        </button>
        {canClose && (
          <button
            className={`${styles.paneAction} ${styles.closeAction}`}
            onClick={(e) => { e.stopPropagation(); onClose() }}
            title="Close Pane"
          >
            &#x2715;
          </button>
        )}
      </div>
    </div>
  )
}
