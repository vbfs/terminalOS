import React from 'react'
import styles from './TermPane.module.css'

interface AIBadgeProps {
  name: string
  color: string
}

export const AIBadge: React.FC<AIBadgeProps> = ({ name, color }) => {
  return (
    <span className={styles.aiBadge}>
      <span
        className={styles.aiBadgeDot}
        style={{ backgroundColor: color }}
      />
      <span className={styles.aiBadgeName}>{name}</span>
    </span>
  )
}
