import React, { useRef, useMemo } from 'react'
import styles from './TermPane.module.css'
import { PaneHeader } from './PaneHeader'
import { usePty } from '../../hooks/usePty'
import { useSessionsStore } from '../../store/sessions.store'
import type { Session } from '../../types/session'

interface TermPaneProps {
  sessionId: string
}

export const TermPane: React.FC<TermPaneProps> = React.memo(({ sessionId }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const session = useSessionsStore((s) => s.sessions.get(sessionId))
  const focusedSessionId = useSessionsStore((s) => s.focusedSessionId)
  const setFocusedSession = useSessionsStore((s) => s.setFocusedSession)
  const sessionOrder = useSessionsStore((s) => s.sessionOrder)
  const sessionsMap = useSessionsStore((s) => s.sessions)
  const sessions = useMemo(
    () => sessionOrder.map((id) => sessionsMap.get(id)).filter((s): s is Session => s !== undefined),
    [sessionOrder, sessionsMap]
  )

  const isFocused = focusedSessionId === sessionId

  usePty({ sessionId, containerRef })

  // Find shared paths: cwds that appear in more than one session
  const cwdMap = new Map<string, number>()
  for (const s of sessions) {
    if (s.cwd) cwdMap.set(s.cwd, (cwdMap.get(s.cwd) ?? 0) + 1)
  }
  const sharedPaths = session?.cwd && (cwdMap.get(session.cwd) ?? 0) > 1
    ? [session.cwd.split('/').pop() ?? session.cwd]
    : []

  const handleClick = () => {
    setFocusedSession(sessionId)
    window.dispatchEvent(new CustomEvent('focus-input-bar'))
  }

  if (!session) return null

  return (
    <div
      className={`${styles.termPane} ${isFocused ? styles.focused : ''}`}
      onClick={handleClick}
    >
      <PaneHeader session={session} isFocused={isFocused} sharedPaths={sharedPaths} />

      {session.alertMessage && (
        <div className={styles.inlineAlert}>
          {session.alertMessage}
        </div>
      )}

      <div ref={containerRef} className={styles.terminal} />
    </div>
  )
})

TermPane.displayName = 'TermPane'
