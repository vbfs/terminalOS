import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { useSessionsStore } from '../store/sessions.store'

const termTheme = {
  background: '#0a0a0c',
  foreground: '#dddbd4',
  cursor: '#e8a44a',
  cursorAccent: '#0a0a0c',
  selectionBackground: 'rgba(221, 219, 212, 0.15)',
  black: '#1e1e26',
  brightBlack: '#5a5a62',
  red: '#f87171',
  brightRed: '#f87171',
  green: '#4ade80',
  brightGreen: '#4ade80',
  yellow: '#e8a44a',
  brightYellow: '#e8a44a',
  blue: '#60a5fa',
  brightBlue: '#60a5fa',
  magenta: '#7b6ef6',
  brightMagenta: '#7b6ef6',
  cyan: '#2dd4bf',
  brightCyan: '#2dd4bf',
  white: '#dddbd4',
  brightWhite: '#ffffff',
}

// Parse token count from PTY stdout
function parseTokens(data: string): number | null {
  // Pattern: ↑ 2.4k tokens  or  ↑ 2,400 tokens
  const m1 = data.match(/↑\s*([\d.,]+)(k)?\s*tokens/i)
  if (m1) {
    const val = parseFloat(m1[1].replace(',', '.'))
    return m1[2] ? Math.round(val * 1000) : Math.round(val)
  }
  // Pattern: tokens used: 18234
  const m2 = data.match(/tokens\s+used:\s*([\d,]+)/i)
  if (m2) return parseInt(m2[1].replace(/,/g, ''))
  // Pattern: "5.2k tokens" in parentheses
  const m3 = data.match(/\(\s*([\d.,]+)(k)?\s*tokens\s*\)/i)
  if (m3) {
    const val = parseFloat(m3[1].replace(',', '.'))
    return m3[2] ? Math.round(val * 1000) : Math.round(val)
  }
  return null
}

// Parse error alert from PTY stdout
function parseAlert(data: string): string | null {
  if (/API Error:.*404.*model.*not found/i.test(data)) {
    const m = data.match(/model[:\s'"]+([^\s'"]+)/i)
    return `Model '${m?.[1] ?? 'unknown'}' not found`
  }
  if (/Auth conflict.*ANTHROPIC_AUTH_TOKEN/i.test(data)) {
    return 'Auth conflict: use ANTHROPIC_API_KEY instead of ANTHROPIC_AUTH_TOKEN'
  }
  if (/authentication.*failed/i.test(data) || /Invalid API key/i.test(data)) {
    return 'API key authentication failed — check your ANTHROPIC_API_KEY'
  }
  return null
}

interface UsePtyOptions {
  sessionId: string
  containerRef: React.RefObject<HTMLDivElement | null>
  onReady?: () => void
}

export function usePty({ sessionId, containerRef, onReady }: UsePtyOptions) {
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const searchAddonRef = useRef<SearchAddon | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingDataRef = useRef<string[]>([])
  const initializedRef = useRef(false)
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSizeRef = useRef({ cols: 0, rows: 0 })

  const { updateStatus, updateCwd, setAiProcess, updateTokens, setAlert } = useSessionsStore()

  const flushData = useCallback(() => {
    if (pendingDataRef.current.length === 0) return
    const term = termRef.current
    if (!term) return
    const chunk = pendingDataRef.current.join('')
    pendingDataRef.current = []
    term.write(chunk)
    rafRef.current = null
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return

      if (!initializedRef.current) {
        initializedRef.current = true

        const terminal = new Terminal({
          fontFamily: '"JetBrains Mono", "MesloLGS NF", "Hack Nerd Font", "Cascadia Code", monospace',
          fontSize: 13,
          lineHeight: 1.5,
          letterSpacing: 0,
          theme: termTheme,
          allowTransparency: false,
          fastScrollModifier: 'alt',
          scrollback: 5000,
          macOptionIsMeta: true,
          cursorBlink: true,
          cursorStyle: 'block',
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        const searchAddon = new SearchAddon()

        terminal.loadAddon(fitAddon)
        terminal.loadAddon(webLinksAddon)
        terminal.loadAddon(searchAddon)

        terminal.attachCustomKeyEventHandler((e) => {
          // Let Cmd+* combos through to global keymap
          if (e.metaKey) return false
          return true
        })

        terminal.open(container)
        fitAddon.fit()

        termRef.current = terminal
        fitAddonRef.current = fitAddon
        searchAddonRef.current = searchAddon

        const { cols, rows } = terminal
        lastSizeRef.current = { cols, rows }
        setTimeout(() => {
          if (!termRef.current) return
          window.api.pty.resize(sessionId, cols, rows)
          // Ctrl+L: clears screen and redraws prompt atomically (avoids duplicate prompt)
          setTimeout(() => {
            window.api.pty.write(sessionId, '\x0c')
          }, 30)
        }, 50)

        // Forward any direct terminal input to PTY (fallback)
        terminal.onData((data) => {
          window.api.pty.write(sessionId, data)
        })

        // OSC 7: track CWD changes
        terminal.parser.registerOscHandler(7, (data) => {
          try {
            const url = new URL(data)
            updateCwd(sessionId, decodeURIComponent(url.pathname))
          } catch {
            if (data && !data.startsWith('file://')) updateCwd(sessionId, data)
          }
          return true
        })

        onReady?.()
      } else {
        if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
        resizeDebounceRef.current = setTimeout(() => {
          const fit = fitAddonRef.current
          const term = termRef.current
          if (!fit || !term) return
          fit.fit()
          const { cols, rows } = term
          if (cols !== lastSizeRef.current.cols || rows !== lastSizeRef.current.rows) {
            lastSizeRef.current = { cols, rows }
            window.api.pty.resize(sessionId, cols, rows)
          }
        }, 80)
      }
    })

    ro.observe(container)

    const unsubData = window.api.pty.onData((id, data) => {
      if (id !== sessionId) return

      // Token parsing
      const tokens = parseTokens(data)
      if (tokens !== null) updateTokens(sessionId, tokens)

      // Alert parsing
      const alert = parseAlert(data)
      if (alert !== null) setAlert(sessionId, alert)

      pendingDataRef.current.push(data)
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushData)
      }
    })

    const unsubExit = window.api.pty.onExit((id, code) => {
      if (id !== sessionId) return
      updateStatus(sessionId, code === 0 ? 'exited' : 'error', code)
    })

    const unsubAiDetected = window.api.pty.onAiDetected((id, aiProcess) => {
      if (id !== sessionId) return
      setAiProcess(sessionId, aiProcess)
      // Clear alert when AI starts fresh
      setAlert(sessionId, null)
    })

    const unsubAiExited = window.api.pty.onAiExited((id) => {
      if (id !== sessionId) return
      setAiProcess(sessionId, null)
    })

    return () => {
      ro.disconnect()
      unsubData()
      unsubExit()
      unsubAiDetected()
      unsubAiExited()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
      termRef.current?.dispose()
      termRef.current = null
      fitAddonRef.current = null
      initializedRef.current = false
      lastSizeRef.current = { cols: 0, rows: 0 }
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback((query: string) => {
    searchAddonRef.current?.findNext(query)
  }, [])

  const fit = useCallback(() => {
    fitAddonRef.current?.fit()
  }, [])

  return { termRef, search, fit }
}
