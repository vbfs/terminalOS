import React, { useRef } from 'react'
import styles from './TermPane.module.css'
import { PaneHeader } from './PaneHeader'
import { usePty } from '../../hooks/usePty'
import { useSessionsStore } from '../../store/sessions.store'
import { useTabsStore } from '../../store/tabs.store'
import type { SplitDirection } from '../../types/pane'

interface TermPaneProps {
  sessionId: string
  paneId: string
  isActive: boolean
  canClose: boolean
  onSplit: (paneId: string, dir: SplitDirection) => void
  onClose: (paneId: string) => void
  onFocus: (paneId: string) => void
  onOpenMd?: (paneId: string) => void
}

export const TermPane: React.FC<TermPaneProps> = React.memo(
  ({ sessionId, paneId, isActive, canClose, onSplit, onClose, onFocus, onOpenMd }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const session = useSessionsStore((s) => s.sessions.get(sessionId))
    const isMinimized = useTabsStore((s) => s.minimizedPanes.has(paneId))
    const toggleMinimize = useTabsStore((s) => s.toggleMinimizePane)

    usePty({ sessionId, containerRef })

    if (!session) return null

    return (
      <div
        className={`${styles.termPane} ${isActive ? styles.focused : ''} ${isMinimized ? styles.minimized : ''}`}
        onMouseDown={() => onFocus(paneId)}
      >
        <PaneHeader
          session={session}
          isFocused={isActive}
          paneId={paneId}
          canClose={canClose}
          isMinimized={isMinimized}
          onSplit={onSplit}
          onClose={onClose}
          onOpenMd={onOpenMd}
          onToggleMinimize={toggleMinimize}
        />

        {!isMinimized && session.alertMessage && (
          <div className={styles.inlineAlert}>{session.alertMessage}</div>
        )}

        <div ref={containerRef} className={styles.terminal} />
      </div>
    )
  }
)

TermPane.displayName = 'TermPane'
