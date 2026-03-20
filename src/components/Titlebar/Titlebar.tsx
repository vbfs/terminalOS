import React, { useState } from 'react'
import styles from './Titlebar.module.css'
import { useWorkspaceStore } from '../../store/workspace.store'

export const Titlebar: React.FC = () => {
  const rootFolder = useWorkspaceStore((s) => s.rootFolder)
  const gitBranch = useWorkspaceStore((s) => s.gitBranch)
  const [isMac] = useState(() => navigator.platform.toLowerCase().includes('mac'))

  const workspaceName = rootFolder
    ? rootFolder.split('/').pop() ?? 'aiTerm'
    : 'aiTerm'

  return (
    <div className={styles.titlebar}>
      {isMac && <div className={styles.trafficLights} />}

      <div className={styles.meta}>
        <span className={styles.workspaceName}>{workspaceName}</span>
        {gitBranch && (
          <span className={styles.branch}>
            <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm3-8.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
            </svg>
            {gitBranch}
          </span>
        )}
      </div>

      {!isMac && (
        <div className={styles.windowControls}>
          <button onClick={() => window.api.window.minimize()} className={styles.winBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="0" y="4.5" width="10" height="1" />
            </svg>
          </button>
          <button onClick={() => window.api.window.maximize()} className={styles.winBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          </button>
          <button onClick={() => window.api.window.close()} className={`${styles.winBtn} ${styles.closeBtn}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
