import React, { useEffect, useState } from 'react'
import { Titlebar } from './components/Titlebar/Titlebar'
import { TabBar } from './components/TabBar/TabBar'
import { PaneGrid } from './components/PaneGrid/PaneGrid'
import { StatusBar } from './components/StatusBar/StatusBar'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { useTabsStore } from './store/tabs.store'
import { useSessionsStore } from './store/sessions.store'
import { useWorkspaceStore } from './store/workspace.store'
import { useKeymap } from './hooks/useKeymap'
import type { Session } from './types/session'
import styles from './App.module.css'

async function spawnTabSession(
  tabId: string,
  cwd: string | undefined,
  initTabRoot: (tabId: string, sessionId: string) => string,
  addSession: (session: Session) => void
) {
  const sessionId = await window.api.pty.create({ cwd })
  const paneId = initTabRoot(tabId, sessionId)
  addSession({
    id: sessionId,
    paneId,
    cwd: cwd ?? '',
    status: 'running',
    aiProcess: null,
    createdAt: Date.now(),
  })
}

export const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { tabs, activeTabId, createTab, initTabRoot } = useTabsStore()
  const { addSession } = useSessionsStore()
  const { rootFolder } = useWorkspaceStore()

  const handleNewTab = async () => {
    const n = tabs.length + 1
    const tabId = createTab(`Shell ${n}`)
    const cwd = rootFolder ?? undefined
    await spawnTabSession(tabId, cwd, initTabRoot, addSession)
  }

  useKeymap({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onNewTab: handleNewTab,
  })

  // Initialize the first tab on mount
  useEffect(() => {
    const tabId = createTab('Shell 1')
    const cwd = rootFolder ?? undefined
    spawnTabSession(tabId, cwd, initTabRoot, addSession)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.app}>
      <Titlebar />
      <TabBar onNewTab={handleNewTab} />
      <div className={styles.body}>
        <div className={styles.paneArea}>
          {tabs.map((tab) => (
            <PaneGrid
              key={tab.id}
              tabId={tab.id}
              isActive={tab.id === activeTabId}
            />
          ))}
        </div>
      </div>
      <StatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
