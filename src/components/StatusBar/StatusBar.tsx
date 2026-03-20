import React, { useEffect, useState } from 'react'
import styles from './StatusBar.module.css'
import { useSessionsStore } from '../../store/sessions.store'
import { useWorkspaceStore } from '../../store/workspace.store'
import { useTabsStore } from '../../store/tabs.store'

function useTime() {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return time
}

function shortPath(fullPath: string): string {
  const parts = fullPath.replace(/^\/Users\/[^/]+/, '~').split('/')
  return parts.slice(-3).join('/')
}

export const StatusBar: React.FC = () => {
  const sessions = useSessionsStore((s) => s.sessions)
  const gitBranch = useWorkspaceStore((s) => s.gitBranch)
  const time = useTime()

  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activePaneSession = activeTab?.activePaneId
    ? Array.from(sessions.values()).find((s) => s.paneId === activeTab.activePaneId)
    : undefined

  const activeSessions = Array.from(sessions.values()).filter(s => s.status === 'running')
  const aiSessions = activeSessions.filter(s => s.aiProcess !== null)

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.item}>{activeSessions.length} pane{activeSessions.length !== 1 ? 's' : ''}</span>
        {aiSessions.length > 0 && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.aiDots}>
              {aiSessions.map((s) => (
                <span
                  key={s.id}
                  className={styles.aiDot}
                  style={{ backgroundColor: s.aiProcess!.color }}
                  title={s.aiProcess!.name}
                />
              ))}
            </span>
            <span className={styles.item}>{aiSessions.length} ai</span>
          </>
        )}
      </div>

      <div className={styles.right}>
        {activePaneSession?.cwd && (
          <span className={styles.item}>{shortPath(activePaneSession.cwd)}</span>
        )}
        {gitBranch && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.item}>&#x2387; {gitBranch}</span>
          </>
        )}
        <span className={styles.sep}>·</span>
        <span className={styles.item}>{time}</span>
      </div>
    </div>
  )
}
