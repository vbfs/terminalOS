import React, { useRef, useState } from 'react'
import styles from './TabBar.module.css'
import { useTabsStore } from '../../store/tabs.store'
import type { Tab } from '../../store/tabs.store'

interface TabItemProps {
  tab: Tab
  isActive: boolean
  onActivate: () => void
  onClose: () => void
  onRename: (name: string) => void
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onActivate, onClose, onRename }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tab.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (e: React.MouseEvent) => {
    if (!isActive) return
    e.stopPropagation()
    setDraft(tab.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== tab.name) onRename(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div
      className={`${styles.tab} ${isActive ? styles.active : ''}`}
      onClick={onActivate}
      onDoubleClick={startEdit}
      title={tab.name}
    >
      <span className={styles.tabIcon}>›_</span>

      {editing ? (
        <input
          ref={inputRef}
          className={styles.tabInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={styles.tabName}>{tab.name}</span>
      )}

      {tab.paneCount > 1 && (
        <span className={styles.paneCount}>{tab.paneCount}</span>
      )}

      <button
        className={styles.closeBtn}
        onClick={(e) => { e.stopPropagation(); onClose() }}
        title="Close tab"
      >
        ×
      </button>
    </div>
  )
}

interface TabBarProps {
  onNewTab: () => void
}

export const TabBar: React.FC<TabBarProps> = ({ onNewTab }) => {
  const { tabs, activeTabId, setActiveTab, closeTab, renameTab } = useTabsStore()

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onActivate={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
            onRename={(name) => renameTab(tab.id, name)}
          />
        ))}
      </div>

      <button
        className={styles.newTabBtn}
        onClick={onNewTab}
        title="New tab (⌘T)"
      >
        +
      </button>
    </div>
  )
}
