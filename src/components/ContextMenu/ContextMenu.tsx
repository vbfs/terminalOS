import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './ContextMenu.module.css'

export const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)

export interface ContextMenuItem {
  icon?: string
  label: string
  shortcut?: string
  onClick: () => void | Promise<void>
  danger?: boolean
  disabled?: boolean
}

interface ContextMenuGroup {
  items: ContextMenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  groups: ContextMenuGroup[]
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, groups, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Estimate menu size for viewport clamping
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0)
  const separators = groups.length - 1
  const estH = itemCount * 30 + separators * 9 + 8
  const adjX = Math.min(x, window.innerWidth - 236 - 8)
  const adjY = Math.min(y, window.innerHeight - estH - 8)

  useEffect(() => {
    let mounted = false
    const tid = setTimeout(() => {
      mounted = true
    }, 0)

    const handleMouseDown = (e: MouseEvent) => {
      if (!mounted) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      clearTimeout(tid)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [onClose])

  const menu = (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ top: Math.max(8, adjY), left: Math.max(8, adjX) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className={styles.divider} />}
          {group.items.map((item, ii) => (
            <button
              key={ii}
              className={[
                styles.item,
                item.danger ? styles.danger : '',
                item.disabled ? styles.itemDisabled : '',
              ].join(' ')}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!item.disabled) {
                  item.onClick()
                  onClose()
                }
              }}
            >
              <span className={styles.icon}>{item.icon ?? '›'}</span>
              <span className={styles.label}>{item.label}</span>
              {item.shortcut && <kbd className={styles.shortcut}>{item.shortcut}</kbd>}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}
