import React, { useRef } from 'react'
import styles from './TermPane.module.css'
import { PaneHeader } from './PaneHeader'
import { usePty } from '../../hooks/usePty'
import { useSessionsStore } from '../../store/sessions.store'
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

    usePty({ sessionId, containerRef })

    if (!session) return null

    return (
      <div
        className={`${styles.termPane} ${isActive ? styles.focused : ''}`}
        onMouseDown={() => onFocus(paneId)}
      >
        <PaneHeader
          session={session}
          isFocused={isActive}
          paneId={paneId}
          canClose={canClose}
          onSplit={onSplit}
          onClose={onClose}
          onOpenMd={onOpenMd}
        />

        {session.alertMessage && (
          <div className={styles.inlineAlert}>{session.alertMessage}</div>
        )}

        <div ref={containerRef} className={styles.terminal} />
      </div>
    )
  }
)

TermPane.displayName = 'TermPane'
