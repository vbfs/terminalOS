import React from 'react'
import styles from './TermPane.module.css'
import { Tooltip } from '../Tooltip/Tooltip'

interface AIBadgeProps {
  name: string
  color: string
}

export const AIBadge: React.FC<AIBadgeProps> = ({ name, color }) => {
  return (
    <Tooltip content="AI process detected — tokens are being tracked" placement="bottom">
      <span className={styles.aiBadge} style={{ cursor: 'default' }}>
        <span
          className={styles.aiBadgeDot}
          style={{ backgroundColor: color }}
        />
        <span className={styles.aiBadgeName}>{name}</span>
      </span>
    </Tooltip>
  )
}
