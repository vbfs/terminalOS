import React from 'react'
import styles from './TermPane.module.css'
import { AgentBadge, StatusDot } from '../TabBar/TabBar'
import { getAgentType, getDotState } from '../../types/session'
import type { Session } from '../../types/session'

interface PaneHeaderProps {
  session: Session
  isFocused: boolean
  sharedPaths: string[]
}

function shortPath(cwd: string): string {
  if (!cwd) return '~'
  const parts = cwd.replace(/^\/Users\/[^/]+/, '~').split('/')
  return parts.slice(-2).join('/')
}

export const PaneHeader: React.FC<PaneHeaderProps> = ({ session, isFocused, sharedPaths }) => {
  const agentType = getAgentType(session)
  const dotState = getDotState(session)
  const path = shortPath(session.cwd)
  const hasShared = sharedPaths.length > 0

  return (
    <div className={`${styles.paneHeader} ${isFocused ? styles.focused : ''}`}>
      <div className={styles.paneHeaderLeft}>
        <StatusDot state={dotState} />
        <AgentBadge type={agentType} small />
        <span className={styles.sessionName}>{session.name}</span>
        <span className={styles.sessionPath}>{path}</span>
      </div>

      {hasShared && (
        <div className={styles.sharedCtxPill}>
          <span className={styles.sharedDot} />
          <span className={styles.sharedLabel}>shared ctx</span>
        </div>
      )}
    </div>
  )
}
