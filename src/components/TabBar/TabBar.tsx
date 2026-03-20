import React, { useState, useRef } from 'react'
import styles from './TabBar.module.css'
import { useTabsStore } from '../../store/tabs.store'
import { useSessionsStore } from '../../store/sessions.store'
import { getAgentType, getDotState } from '../../types/session'
import { getAllLeaves } from '../../types/pane'
import type { AgentType, DotState } from '../../types/session'

const AGENT_LABELS: Record<AgentType, string> = {
  CLAUDE: 'CLAUDE',
  OC: 'OC',
  SHELL: 'SHELL',
}

export const AgentBadge: React.FC<{ type: AgentType; small?: boolean }> = ({ type, small }) => (
  <span className={`${styles.agentBadge} ${styles[`badge${type}`]} ${small ? styles.badgeSmall : ''}`}>
    {AGENT_LABELS[type]}
  </span>
)

export const StatusDot: React.FC<{ state: DotState }> = ({ state }) => (
  <span className={`${styles.statusDot} ${styles[`dot${state}`]}`} />
)

interface TabBarProps {
  onNewTab: () => void
  onCloseTab: (tabId: string) => void
}

export const TabBar: React.FC<TabBarProps> = ({ onNewTab, onCloseTab }) => {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const setActiveTab = useTabsStore((s) => s.setActiveTab)
  const renameTab = useTabsStore((s) => s.renameTab)
  const sessionsMap = useSessionsStore((s) => s.sessions)

  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const getTabDotState = (tabId: string): DotState => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab?.root) return 'idle'
    const leaves = getAllLeaves(tab.root)
    for (const leaf of leaves) {
      // Find session by paneId matching leaf.id
      for (const session of sessionsMap.values()) {
        if (session.paneId === leaf.id) {
          const ds = getDotState(session)
          if (ds === 'waiting') return 'waiting'
          if (ds === 'running') return 'running'
        }
      }
    }
    return 'idle'
  }

  const getTabAgentType = (tabId: string): AgentType => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab?.root) return 'SHELL'
    const leaves = getAllLeaves(tab.root)
    const activePaneLeaf = leaves.find((l) => l.id === tab.activePaneId) ?? leaves[0]
    if (!activePaneLeaf) return 'SHELL'
    for (const session of sessionsMap.values()) {
      if (session.paneId === activePaneLeaf.id) return getAgentType(session)
    }
    return 'SHELL'
  }

  const startRename = (tabId: string, currentName: string) => {
    setEditingTabId(tabId)
    setEditValue(currentName)
    setTimeout(() => editRef.current?.select(), 0)
  }

  const commitRename = () => {
    if (editingTabId && editValue.trim()) {
      renameTab(editingTabId, editValue.trim())
    }
    setEditingTabId(null)
  }

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const dotState = getTabDotState(tab.id)
          const agentType = getTabAgentType(tab.id)

          return (
            <div
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => startRename(tab.id, tab.name)}
              title={tab.name}
            >
              <StatusDot state={dotState} />
              <AgentBadge type={agentType} />
              {editingTabId === tab.id ? (
                <input
                  ref={editRef}
                  className={styles.tabNameInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingTabId(null)
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span className={styles.tabName}>{tab.name}</span>
              )}
              {tabs.length > 1 && (
                <button
                  className={styles.closeTabBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(tab.id)
                  }}
                  title="Close project"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        className={styles.newTabBtn}
        onClick={onNewTab}
        title="New project (Cmd+T)"
      >
        +
      </button>
    </div>
  )
}

// Re-export for backwards compat (SessionTabBar was the old name)
export { TabBar as SessionTabBar }
