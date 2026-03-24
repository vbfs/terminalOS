import React, { useEffect, useRef } from 'react'
import { THEMES } from '../../themes'
import { usePreferencesStore } from '../../store/preferences.store'
import styles from './Settings.module.css'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { themeId, setTheme } = usePreferencesStore()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Appearance</div>
          <div className={styles.themeGrid}>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                className={`${styles.themeCard} ${themeId === theme.id ? styles.selected : ''}`}
                onClick={() => setTheme(theme.id)}
              >
                <div className={styles.themePreview}>
                  {theme.preview.map((color, i) => (
                    <div
                      key={i}
                      className={styles.previewSwatch}
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <span className={styles.themeName}>{theme.name}</span>
                {themeId === theme.id && <span className={styles.checkmark}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
