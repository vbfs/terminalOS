import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { useSessionsStore } from '../store/sessions.store'

const termTheme = {
  background: '#0F0F0F',
  foreground: '#E4E4E2',
  cursor: '#E4E4E2',
  cursorAccent: '#0F0F0F',
  selectionBackground: 'rgba(232, 232, 230, 0.15)',
  black: '#1A1A1A',
  brightBlack: '#3A3A3A',
  red: '#9E5A5A',
  brightRed: '#C47A7A',
  green: '#5A9E6F',
  brightGreen: '#7AC494',
  yellow: '#C4893A',
  brightYellow: '#E4A95A',
  blue: '#5A7A9E',
  brightBlue: '#7A9AC4',
  magenta: '#8A5A9E',
  brightMagenta: '#AA7AC4',
  cyan: '#5A9E8A',
  brightCyan: '#7AC4B0',
  white: '#C8C8C6',
  brightWhite: '#E8E8E6',
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

  const { updateStatus, updateCwd, setAiProcess } = useSessionsStore()

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

    // Single ResizeObserver: initializes terminal on first non-zero size, fits on subsequent
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return

      if (!initializedRef.current) {
        initializedRef.current = true

        const terminal = new Terminal({
          fontFamily: '"MesloLGS NF", "Hack Nerd Font", "FiraCode Nerd Font", "JetBrainsMono Nerd Font", "Cascadia Code", "JetBrains Mono", "Fira Code", "Menlo", "Monaco", monospace',
          fontSize: 13,
          lineHeight: 1.2,
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
          // Prevent Cmd+* combos from being forwarded to the PTY.
          // These are handled by the app's global keymap (useKeymap).
          if (e.metaKey) return false
          return true
        })

        terminal.open(container)
        fitAddon.fit()

        termRef.current = terminal
        fitAddonRef.current = fitAddon
        searchAddonRef.current = searchAddon

        // Delay first resize by 400ms so the shell finishes initializing
        // before receiving SIGWINCH — prevents garbage characters on first render
        const { cols, rows } = terminal
        lastSizeRef.current = { cols, rows }
        setTimeout(() => {
          if (termRef.current) {
            window.api.pty.resize(sessionId, cols, rows)
          }
        }, 400)

        terminal.onData((data) => {
          window.api.pty.write(sessionId, data)
        })

        // OSC 7: track real-time CWD changes (format: file://hostname/path)
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
        // Subsequent resizes: debounce fit to avoid SIGWINCH spam
        if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
        resizeDebounceRef.current = setTimeout(() => {
          const fit = fitAddonRef.current
          const term = termRef.current
          if (!fit || !term) return
          fit.fit()
          const { cols, rows } = term
          // Only send resize if size actually changed
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
