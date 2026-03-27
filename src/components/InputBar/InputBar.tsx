import { api } from "../../api";
import React, { useRef, useState, useEffect, useMemo } from 'react'
import styles from './InputBar.module.css'
import { useSessionsStore } from '../../store/sessions.store'
import { getDotState } from '../../types/session'
import type { Session } from '../../types/session'
import { IconChevronDown, IconSend } from '../Icons'
import { Tooltip } from '../Tooltip/Tooltip'
import { track } from '../../lib/amplitude'

export const InputBar: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [isBroadcast, setIsBroadcast] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const sessionOrder = useSessionsStore((s) => s.sessionOrder)
  const sessionsMap = useSessionsStore((s) => s.sessions)
  const sessions = useMemo(
    () => sessionOrder.map((id) => sessionsMap.get(id)).filter((s): s is Session => s !== undefined),
    [sessionOrder, sessionsMap]
  )
  const focusedSessionId = useSessionsStore((s) => s.focusedSessionId)
  const setFocusedSession = useSessionsStore((s) => s.setFocusedSession)
  const rotateSession = useSessionsStore((s) => s.rotateSession)

  const focusedSession = sessions.find((s) => s.id === focusedSessionId) ?? sessions[0] ?? null
  const runningCount = sessions.filter((s) => s.status === 'running').length

  // Keep input focused whenever 'focus-input-bar' event fires
  useEffect(() => {
    const handler = () => inputRef.current?.focus()
    window.addEventListener('focus-input-bar', handler)
    return () => window.removeEventListener('focus-input-bar', handler)
  }, [])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendText = (payload: string) => {
    if (isBroadcast) {
      for (const s of sessions) {
        if (s.status === 'running') api.pty.write(s.id, payload)
      }
    } else if (focusedSession) {
      api.pty.write(focusedSession.id, payload)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.length > 0) {
        track('terminal_enter', { source: 'input_bar' })
        sendText(text + '\r')
        setText('')
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      rotateSession()
      return
    }
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault()
      setIsBroadcast((b) => !b)
      return
    }
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      sendText('\x03')
      setText('')
      return
    }
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault()
      sendText('\x04')
      return
    }
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      sendText('\x0c')
      return
    }
  }

  const handleSend = () => {
    if (text.length > 0) {
      track('terminal_enter', { source: 'send_button' })
      sendText(text + '\r')
      setText('')
    }
    inputRef.current?.focus()
  }

  const dotState = focusedSession ? getDotState(focusedSession) : 'idle'

  return (
    <div className={styles.inputBar}>
      {/* Session Selector */}
      <div className={styles.selector} onClick={() => setDropdownOpen((o) => !o)}>
        <span className={`${styles.selectorDot} ${styles[`dot${dotState}`]}`} />
        <span className={styles.selectorName}>{focusedSession?.name ?? 'No session'}</span>
        <span className={styles.selectorChevron}><IconChevronDown size={10} /></span>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            {sessions.map((s) => {
              const ds = getDotState(s)
              return (
                <div
                  key={s.id}
                  className={`${styles.dropdownItem} ${s.id === focusedSessionId ? styles.dropdownActive : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setFocusedSession(s.id)
                    setDropdownOpen(false)
                    inputRef.current?.focus()
                  }}
                >
                  <span className={`${styles.selectorDot} ${styles[`dot${ds}`]}`} />
                  <span>{s.name}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input field */}
      <div className={`${styles.inputWrapper} ${isBroadcast ? styles.broadcasting : ''}`}>
        <Tooltip
          content={isBroadcast ? `Broadcasting to ${runningCount} sessions` : "Send to focused session"}
          shortcut="Ctrl+B"
          placement="top"
        >
          <span className={styles.askPill}>{isBroadcast ? 'BC' : 'ASK'}</span>
        </Tooltip>
        <input
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isBroadcast
              ? `Broadcasting to ${runningCount} sessions`
              : 'Send to active session · Tab to switch · Ctrl+B to broadcast'
          }
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* Send button */}
      <button className={styles.sendBtn} onClick={handleSend} title="Send (Enter)">
        <IconSend size={13} />
      </button>
    </div>
  )
}
