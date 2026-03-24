import React from 'react'
import styles from './PromptBar.module.css'
import type { Session } from '../../types/session'

interface PromptBarProps {
  session: Session
}

function shortPath(cwd: string): string {
  if (!cwd) return '~'
  return cwd.replace(/^\/Users\/[^/]+/, '~')
}

export const PromptBar: React.FC<PromptBarProps> = ({ session }) => {
  const path = shortPath(session.cwd)
  const env = session.condaEnv

  return (
    <div className={styles.promptBar}>
      <div className={styles.left}>
        {env && (
          <span className={styles.envBadge}>
            <span className={styles.envIcon}>›</span>
            <span className={styles.envName}>{env}</span>
          </span>
        )}
        <span className={styles.pathBadge}>{path}</span>
      </div>
    </div>
  )
}
