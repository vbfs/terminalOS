import { api } from "../api";
import { useEffect } from 'react'
import { useTabsStore } from '../store/tabs.store'
import { useWorkspaceStore } from '../store/workspace.store'
import { useSessionsStore } from '../store/sessions.store'
import { useUiStore } from '../store/ui.store'

interface KeymapHandlers {
  onCommandPalette?: () => void
  onNewTab?: () => void
  onOpenMd?: () => void
}

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+')
  const modifiers = parts.slice(0, -1)
  const key = parts[parts.length - 1]

  const ctrlOrCmd = modifiers.includes('cmdorctrl')
  const shift = modifiers.includes('shift')
  const alt = modifiers.includes('alt')

  const platformMod = ctrlOrCmd && (e.metaKey || e.ctrlKey)
  const shiftOk = shift ? e.shiftKey : !e.shiftKey
  const altOk = alt ? e.altKey : !e.altKey

  return platformMod && shiftOk && altOk && e.key.toLowerCase() === key
}

export function useKeymap(handlers: KeymapHandlers = {}) {
  const tabsStore = useTabsStore()
  const workspaceStore = useWorkspaceStore()
  const sessionsStore = useSessionsStore()
  const setShortcutRefOpen = useUiStore((s) => s.setShortcutRefOpen)
  const shortcutRefOpen = useUiStore((s) => s.shortcutRefOpen)

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeTab = tabsStore.tabs.find((t) => t.id === tabsStore.activeTabId)
      const activePaneId = activeTab?.activePaneId ?? null

      // Shortcut reference panel — ? key (only when not typing in an input)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault()
          setShortcutRefOpen(!shortcutRefOpen)
          return
        }
      }

      // Command palette
      if (matchesShortcut(e, 'CmdOrCtrl+K')) {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      // New tab
      if (matchesShortcut(e, 'CmdOrCtrl+T')) {
        e.preventDefault()
        handlers.onNewTab?.()
        return
      }

      // Split right
      if (matchesShortcut(e, 'CmdOrCtrl+D')) {
        e.preventDefault()
        if (activeTab && activePaneId) {
          const activeSession = Array.from(sessionsStore.sessions.values()).find(s => s.paneId === activePaneId)
          const cwd = activeSession?.cwd || workspaceStore.rootFolder || undefined
          const sessionId = await api.pty.create({ cwd })
          const newPaneId = tabsStore.splitTabPane(activeTab.id, activePaneId, 'h', sessionId)
          sessionsStore.addSession({ id: sessionId, paneId: newPaneId, name: 'Session', cwd: cwd ?? '', status: 'running', aiProcess: null, tokens: 0, model: null, costUsd: 0, alertMessage: null, condaEnv: null, createdAt: Date.now() })
        }
        return
      }

      // Split below
      if (matchesShortcut(e, 'CmdOrCtrl+Shift+D')) {
        e.preventDefault()
        if (activeTab && activePaneId) {
          const activeSession = Array.from(sessionsStore.sessions.values()).find(s => s.paneId === activePaneId)
          const cwd = activeSession?.cwd || workspaceStore.rootFolder || undefined
          const sessionId = await api.pty.create({ cwd })
          const newPaneId = tabsStore.splitTabPane(activeTab.id, activePaneId, 'v', sessionId)
          sessionsStore.addSession({ id: sessionId, paneId: newPaneId, name: 'Session', cwd: cwd ?? '', status: 'running', aiProcess: null, tokens: 0, model: null, costUsd: 0, alertMessage: null, condaEnv: null, createdAt: Date.now() })
        }
        return
      }

      // Close active pane
      if (matchesShortcut(e, 'CmdOrCtrl+W')) {
        e.preventDefault()
        if (activeTab && activePaneId) {
          tabsStore.closeTabPane(activeTab.id, activePaneId)
        }
        return
      }

      // Open Markdown Editor
      if (matchesShortcut(e, 'CmdOrCtrl+Shift+M')) {
        e.preventDefault()
        handlers.onOpenMd?.()
        return
      }

      // Launch Claude Code
      if (matchesShortcut(e, 'CmdOrCtrl+Shift+C')) {
        e.preventDefault()
        if (activePaneId) {
          const session = Array.from(sessionsStore.sessions.values()).find(s => s.paneId === activePaneId)
          if (session) api.pty.write(session.id, 'claude\n')
        }
        return
      }

      // Launch Opencode
      if (matchesShortcut(e, 'CmdOrCtrl+Shift+O')) {
        e.preventDefault()
        if (activePaneId) {
          const session = Array.from(sessionsStore.sessions.values()).find(s => s.paneId === activePaneId)
          if (session) api.pty.write(session.id, 'opencode\n')
        }
        return
      }

      // Open Folder
      if (matchesShortcut(e, 'CmdOrCtrl+O')) {
        e.preventDefault()
        const activeSession = activePaneId
          ? Array.from(sessionsStore.sessions.values()).find(s => s.paneId === activePaneId)
          : undefined
        const folder = await api.fs.openFolder(activeSession?.cwd ?? null)
        if (folder) {
          workspaceStore.setRootFolder(folder)
          if (activeSession) {
            api.pty.write(activeSession.id, `cd "${folder}"\r\n`)
            sessionsStore.updateCwd(activeSession.id, folder)
          }
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabsStore, workspaceStore, sessionsStore, handlers, setShortcutRefOpen, shortcutRefOpen])
}
