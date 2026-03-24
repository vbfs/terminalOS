import React, { useRef, useCallback } from 'react'
import styles from './PaneGrid.module.css'
import { useTabsStore } from '../../store/tabs.store'

interface SplitHandleProps {
  splitId: string
  tabId: string
  direction: 'h' | 'v'
  containerRef: React.RefObject<HTMLDivElement | null>
  currentRatio: number
}

export const SplitHandle: React.FC<SplitHandleProps> = ({
  splitId,
  tabId,
  direction,
  containerRef,
  currentRatio,
}) => {
  const updateTabRatio = useTabsStore((s) => s.updateTabRatio)
  const isDragging = useRef(false)
  const rafRef = useRef<number | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true

      const container = containerRef.current
      if (!container) return

      const startX = e.clientX
      const startY = e.clientY
      const rect = container.getBoundingClientRect()

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return

        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

        rafRef.current = requestAnimationFrame(() => {
          const containerSize =
            direction === 'h' ? rect.width : rect.height
          const delta =
            direction === 'h'
              ? moveEvent.clientX - startX
              : moveEvent.clientY - startY
          const newRatio = currentRatio + delta / containerSize
          updateTabRatio(tabId, splitId, newRatio)
        })
      }

      const onMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [splitId, tabId, direction, containerRef, currentRatio, updateTabRatio]
  )

  return (
    <div
      className={`${styles.splitHandle} ${
        direction === 'h' ? styles.splitHandleH : styles.splitHandleV
      }`}
      onMouseDown={handleMouseDown}
    />
  )
}
