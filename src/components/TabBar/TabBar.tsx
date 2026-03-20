import React, { useMemo } from 'react'
import styles from './TabBar.module.css'
import { useSessionsStore } from '../../store/sessions.store'
import { getAgentType, getDotState } from '../../types/session'
import type { Session, AgentType, DotState } from '../../types/session'

function formatTokens(n: number): string {
  if (n === 0) return ''
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const AGENT_LABELS: Record<AgentType, string> = {
  CLAUDE: 'CLAUDE',
  OC: 'OC',
  SHELL: 'SHELL',
}

interface AgentBadgeProps {
  type: AgentType
  small?: boolean
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ type, small }) => (
  <span className={`${styles.agentBadge} ${styles[`badge${type}`]} ${small ? styles.badgeSmall : ''}`}>
    {AGENT_LABELS[type]}
  </span>
)

interface StatusDotProps {
  state: DotState
}

export const StatusDot: React.FC<StatusDotProps> = ({ state }) => (
  <span className={`${styles.statusDot} ${styles[`dot${state}`]}`} />
)

interface TabItemProps {
  session: Session
  isActive: boolean
  onActivate: () => void
}

const TabItem: React.FC<TabItemProps> = ({ session, isActive, onActivate }) => {
  const agentType = getAgentType(session)
  const dotState = getDotState(session)
  const tokenStr = formatTokens(session.tokens)
  const isError = session.status === 'error'

  return (
    <div
      className={`${styles.tab} ${isActive ? styles.active : ''}`}
      onClick={onActivate}
      title={session.name}
    >
      <StatusDot state={dotState} />
      <AgentBadge type={agentType} />
      <span className={styles.tabName}>{session.name}</span>
      {tokenStr && (
        <span className={`${styles.tokenCount} ${isError ? styles.tokenError : ''}`}>
          {tokenStr}
        </span>
      )}
    </div>
  )
}

interface SessionTabBarProps {
  onNewSession: () => void
}

export const SessionTabBar: React.FC<SessionTabBarProps> = ({ onNewSession }) => {
  const sessionOrder = useSessionsStore((s) => s.sessionOrder)
  const sessionsMap = useSessionsStore((s) => s.sessions)
  const focusedSessionId = useSessionsStore((s) => s.focusedSessionId)
  const setFocusedSession = useSessionsStore((s) => s.setFocusedSession)

  const sessions = useMemo(
    () => sessionOrder.map((id) => sessionsMap.get(id)).filter((s): s is Session => s !== undefined),
    [sessionOrder, sessionsMap]
  )

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {sessions.map((session) => (
          <TabItem
            key={session.id}
            session={session}
            isActive={session.id === focusedSessionId}
            onActivate={() => setFocusedSession(session.id)}
          />
        ))}
      </div>

      <button
        className={styles.newTabBtn}
        onClick={onNewSession}
        disabled={sessions.length >= 4}
        title="New session"
      >
        +
      </button>
    </div>
  )
}
