import React from 'react'
import styles from './TermPane.module.css'
import { AgentBadge, StatusDot } from '../TabBar/TabBar'
import { getAgentType, getDotState } from '../../types/session'
import type { Session } from '../../types/session'
import type { SplitDirection } from '../../types/pane'

interface PaneHeaderProps {
  session: Session
  isFocused: boolean
  paneId: string
  canClose: boolean
  onSplit: (paneId: string, dir: SplitDirection) => void
  onClose: (paneId: string) => void
}

function shortPath(cwd: string): string {
  if (!cwd) return '~'
  const parts = cwd.replace(/^\/Users\/[^/]+/, '~').split('/')
  return parts.slice(-2).join('/')
}

export const PaneHeader: React.FC<PaneHeaderProps> = ({
  session,
  isFocused,
  paneId,
  canClose,
  onSplit,
  onClose,
}) => {
  const agentType = getAgentType(session)
  const dotState = getDotState(session)
  const path = shortPath(session.cwd)

  return (
    <div className={`${styles.paneHeader} ${isFocused ? styles.focused : ''}`}>
      <div className={styles.paneHeaderLeft}>
        <StatusDot state={dotState} />
        <AgentBadge type={agentType} small />
        <span className={styles.sessionName}>{session.name}</span>
        <span className={styles.sessionPath}>{path}</span>
      </div>

      <div className={styles.paneActions}>
        <button
          className={styles.paneActionBtn}
          onClick={(e) => {
            e.stopPropagation()
            onSplit(paneId, 'h')
          }}
          title="Split right (Cmd+D)"
        >
          |
        </button>
        <button
          className={styles.paneActionBtn}
          onClick={(e) => {
            e.stopPropagation()
            onSplit(paneId, 'v')
          }}
          title="Split down (Cmd+Shift+D)"
        >
          —
        </button>
        {canClose && (
          <button
            className={`${styles.paneActionBtn} ${styles.closePaneBtn}`}
            onClick={(e) => {
              e.stopPropagation()
              onClose(paneId)
            }}
            title="Close pane (Cmd+W)"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
