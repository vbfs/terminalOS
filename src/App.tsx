import React, { useEffect, useRef, useState } from 'react'
import { Titlebar } from './components/Titlebar/Titlebar'
import { TabBar } from './components/TabBar/TabBar'
import { PaneGrid } from './components/PaneGrid/PaneGrid'
import { StatusBar } from './components/StatusBar/StatusBar'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { useSessionsStore } from './store/sessions.store'
import { useTabsStore } from './store/tabs.store'
import { useWorkspaceStore } from './store/workspace.store'
import { useKeymap } from './hooks/useKeymap'
import { getAllLeaves } from './types/pane'
import styles from './App.module.css'
import type { SplitDirection } from './types/pane'

export const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const initDoneRef = useRef(false)
  const addSession = useSessionsStore((s) => s.addSession)
  const { createTab, closeTab, initTabRoot, splitTabPane, closeTabPane } = useTabsStore()
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const { rootFolder } = useWorkspaceStore()

  const handleNewTab = async () => {
    const n = useTabsStore.getState().tabs.length + 1
    const tabId = createTab(`Project ${n}`)
    const cwd = rootFolder ?? undefined
    const sessionId = await window.api.pty.create({ cwd })
    const paneId = initTabRoot(tabId, sessionId)
    addSession({
      id: sessionId,
      paneId,
      name: 'shell',
      cwd: cwd ?? '',
      status: 'running',
      aiProcess: null,
      tokens: 0,
      alertMessage: null,
      createdAt: Date.now(),
    })
  }

  const handleSplit = async (tabId: string, paneId: string, dir: SplitDirection) => {
    const activeSession = Array.from(useSessionsStore.getState().sessions.values()).find(
      (s) => s.paneId === paneId
    )
    const cwd = activeSession?.cwd || rootFolder || undefined
    const sessionId = await window.api.pty.create({ cwd })
    const newPaneId = splitTabPane(tabId, paneId, dir, sessionId)
    if (!newPaneId) {
      window.api.pty.kill?.(sessionId)
      return
    }
    addSession({
      id: sessionId,
      paneId: newPaneId,
      name: 'shell',
      cwd: cwd ?? '',
      status: 'running',
      aiProcess: null,
      tokens: 0,
      alertMessage: null,
      createdAt: Date.now(),
    })
  }

  const handleClosePane = (tabId: string, paneId: string) => {
    const sessions = useSessionsStore.getState().sessions
    for (const session of sessions.values()) {
      if (session.paneId === paneId) {
        window.api.pty.kill?.(session.id)
        break
      }
    }
    closeTabPane(tabId, paneId)
  }

  const handleCloseTab = (tabId: string) => {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)
    if (tab?.root) {
      const leaves = getAllLeaves(tab.root)
      const sessions = useSessionsStore.getState().sessions
      for (const leaf of leaves) {
        for (const session of sessions.values()) {
          if (session.paneId === leaf.id) {
            window.api.pty.kill?.(session.id)
          }
        }
      }
    }
    closeTab(tabId)
  }

  useEffect(() => {
    if (initDoneRef.current) return
    initDoneRef.current = true
    const init = async () => {
      const tabId = createTab('Project 1')
      const cwd = rootFolder ?? undefined
      const sessionId = await window.api.pty.create({ cwd })
      const paneId = initTabRoot(tabId, sessionId)
      addSession({
        id: sessionId,
        paneId,
        name: 'shell',
        cwd: cwd ?? '',
        status: 'running',
        aiProcess: null,
        tokens: 0,
        alertMessage: null,
        createdAt: Date.now(),
      })
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useKeymap({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onNewTab: handleNewTab,
  })

  return (
    <div className={styles.app}>
      <Titlebar />
      <TabBar onNewTab={handleNewTab} onCloseTab={handleCloseTab} />
      {activeTabId && (
        <PaneGrid
          tabId={activeTabId}
          onSplit={handleSplit}
          onClose={handleClosePane}
        />
      )}
      <StatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
