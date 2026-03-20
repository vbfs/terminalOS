import React, { useRef } from 'react'
import styles from './TermPane.module.css'
import { PaneHeader } from './PaneHeader'
import { usePty } from '../../hooks/usePty'
import { useTabsStore } from '../../store/tabs.store'
import { useSessionsStore } from '../../store/sessions.store'
import { useWorkspaceStore } from '../../store/workspace.store'

interface TermPaneProps {
  paneId: string
  sessionId: string
  tabId: string
}

export const TermPane: React.FC<TermPaneProps> = React.memo(({ paneId, sessionId, tabId }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const tab = useTabsStore((s) => s.tabs.find((t) => t.id === tabId))
  const tabCount = useTabsStore((s) => s.tabs.length)
  const { splitTabPane, closeTabPane, setTabActivePane } = useTabsStore()
  const { getSession } = useSessionsStore()
  const rootFolder = useWorkspaceStore((s) => s.rootFolder)
  const addSession = useSessionsStore((s) => s.addSession)

  const session = getSession(sessionId)
  const isActive = tab?.activePaneId === paneId
  const canClose = tabCount > 1 || (tab?.paneCount ?? 1) > 1

  usePty({ sessionId, containerRef })

  const handleSplit = async (direction: 'h' | 'v') => {
    const cwd = session?.cwd || rootFolder || undefined
    const newSessionId = await window.api.pty.create({ cwd })
    const newPaneId = splitTabPane(tabId, paneId, direction, newSessionId)
    addSession({
      id: newSessionId,
      paneId: newPaneId,
      cwd: cwd ?? '',
      status: 'running',
      aiProcess: null,
      createdAt: Date.now(),
    })
  }

  const handleClose = () => {
    window.api.pty.kill(sessionId)
    closeTabPane(tabId, paneId)
  }

  return (
    <div
      className={`${styles.termPane} ${isActive ? styles.active : ''}`}
      onClick={() => setTabActivePane(tabId, paneId)}
    >
      <PaneHeader
        paneId={paneId}
        aiProcess={session?.aiProcess ?? null}
        cwd={session?.cwd ?? '~'}
        isActive={isActive}
        canClose={canClose}
        onSplitV={() => handleSplit('v')}
        onSplitH={() => handleSplit('h')}
        onClose={handleClose}
        onFocus={() => setTabActivePane(tabId, paneId)}
      />
      <div ref={containerRef} className={styles.terminal} />
    </div>
  )
})

TermPane.displayName = 'TermPane'
