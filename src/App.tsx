import React, { useEffect } from 'react'
import { Titlebar } from './components/Titlebar/Titlebar'
import { SessionTabBar } from './components/TabBar/TabBar'
import { PaneGrid } from './components/PaneGrid/PaneGrid'
import { InputBar } from './components/InputBar/InputBar'
import { StatusBar } from './components/StatusBar/StatusBar'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { useSessionsStore } from './store/sessions.store'
import { useWorkspaceStore } from './store/workspace.store'
import { useState } from 'react'
import styles from './App.module.css'

const SESSION_NAMES = ['Session 1', 'Session 2', 'Session 3', 'Session 4']

export const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { addSession, getOrderedSessions } = useSessionsStore()
  const { rootFolder } = useWorkspaceStore()

  const createSession = async (name: string) => {
    const cwd = rootFolder ?? undefined
    const sessionId = await window.api.pty.create({ cwd })
    addSession({
      id: sessionId,
      paneId: sessionId,
      name,
      cwd: cwd ?? '',
      status: 'running',
      aiProcess: null,
      tokens: 0,
      alertMessage: null,
      createdAt: Date.now(),
    })
    return sessionId
  }

  const handleNewSession = async () => {
    const sessions = getOrderedSessions()
    if (sessions.length >= 4) return
    const n = sessions.length + 1
    await createSession(`Session ${n}`)
  }

  // Initialize 4 sessions on mount
  useEffect(() => {
    const init = async () => {
      for (let i = 0; i < 4; i++) {
        await createSession(SESSION_NAMES[i])
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={styles.app}>
      <Titlebar />
      <SessionTabBar onNewSession={handleNewSession} />
      <PaneGrid />
      <InputBar />
      <StatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
