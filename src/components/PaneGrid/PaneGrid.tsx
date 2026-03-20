import React, { useMemo } from 'react'
import styles from './PaneGrid.module.css'
import { TermPane } from '../TermPane/TermPane'
import { useSessionsStore } from '../../store/sessions.store'
import type { Session } from '../../types/session'

export const PaneGrid: React.FC = () => {
  const sessionOrder = useSessionsStore((s) => s.sessionOrder)
  const sessionsMap = useSessionsStore((s) => s.sessions)

  const sessions = useMemo(
    () => sessionOrder.map((id) => sessionsMap.get(id)).filter((s): s is Session => s !== undefined),
    [sessionOrder, sessionsMap]
  )

  const slots = sessions.slice(0, 4)

  return (
    <div className={styles.paneGrid}>
      {slots.map((session) => (
        <TermPane key={session.id} sessionId={session.id} />
      ))}
      {Array(Math.max(0, 4 - slots.length))
        .fill(null)
        .map((_, i) => (
          <div key={`empty-${i}`} className={styles.emptySlot}>
            <span className={styles.emptyLabel}>No session</span>
          </div>
        ))}
    </div>
  )
}
