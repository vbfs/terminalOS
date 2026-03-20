import React, { useMemo } from 'react'
import styles from './StatusBar.module.css'
import { useSessionsStore } from '../../store/sessions.store'
import { getAgentType } from '../../types/session'
import type { Session } from '../../types/session'

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export const StatusBar: React.FC = () => {
  const sessionOrder = useSessionsStore((s) => s.sessionOrder)
  const sessionsMap = useSessionsStore((s) => s.sessions)
  const sessions = useMemo(
    () => sessionOrder.map((id) => sessionsMap.get(id)).filter((s): s is Session => s !== undefined),
    [sessionOrder, sessionsMap]
  )

  const running = sessions.filter((s) => s.status === 'running')
  const totalTokens = sessions.reduce((sum, s) => sum + s.tokens, 0)

  // Shared context: cwds appearing in more than one session
  const cwdCount = new Map<string, number>()
  for (const s of sessions) {
    if (s.cwd) cwdCount.set(s.cwd, (cwdCount.get(s.cwd) ?? 0) + 1)
  }
  const sharedPaths = Array.from(cwdCount.entries())
    .filter(([, count]) => count > 1)
    .map(([path]) => path.split('/').pop() ?? path)

  // Unique agent types in use
  const agentTypes = [...new Set(sessions.map((s) => getAgentType(s)))]
  const modelLabels = agentTypes.map((t) => {
    if (t === 'CLAUDE') return 'sonnet-4-6'
    if (t === 'OC') return 'opencode'
    return 'shell'
  })

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.runningDot} />
        <span className={styles.item}>{running.length} running</span>

        {totalTokens > 0 && (
          <>
            <span className={styles.sep}>|</span>
            <span className={styles.muted}>tokens</span>
            <span className={styles.item}>{formatTokens(totalTokens)} ↑</span>
          </>
        )}

        {sharedPaths.length > 0 && (
          <>
            <span className={styles.sep}>|</span>
            <span className={styles.muted}>shared ctx</span>
            {sharedPaths.map((p) => (
              <span key={p} className={styles.tealItem}>{p}</span>
            ))}
          </>
        )}

        {modelLabels.length > 0 && (
          <>
            <span className={styles.sep}>|</span>
            <span className={styles.muted}>model</span>
            <span className={styles.item}>{modelLabels.join(' · ')}</span>
          </>
        )}
      </div>

      <div className={styles.right}>
        <button className={styles.broadcastBtn}>BROADCAST</button>
        <span className={styles.version}>v0.1.0</span>
      </div>
    </div>
  )
}
