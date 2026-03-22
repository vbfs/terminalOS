import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as pty from 'node-pty'
import { v4 as uuidv4 } from 'uuid'
import { ProcessDetector } from './process-detector'

function createZdotdir(): string {
  const zdotdir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiterm-'))
  const zshrc = [
    '# aiTerm: source real .zshrc first',
    'unset ZDOTDIR',
    '[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc"',
    '',
    '# Add our hook as the LAST precmd so it wins over oh-my-zsh/conda/starship',
    '_aiterm_precmd() {',
    '  printf "\\n"',
    '  PROMPT=" "',
    '  RPROMPT=""',
    '  printf "\\033]9001;%s\\007" "${CONDA_DEFAULT_ENV:-}"',
    '}',
    'precmd_functions+=(_aiterm_precmd)',
    '',
    '# Bold the command line after Enter is pressed',
    '_aiterm_preexec() {',
    '  printf "\\x1b[1A\\x1b[2K \\x1b[1m%s\\x1b[22m\\r\\n" "$1"',
    '}',
    'preexec_functions+=(_aiterm_preexec)',
    'PROMPT=" "',
    'RPROMPT=""',
  ].join('\n')
  fs.writeFileSync(path.join(zdotdir, '.zshrc'), zshrc)
  return zdotdir
}

interface Session {
  id: string
  pty: pty.IPty
  buffer: string[]
  flushTimer: ReturnType<typeof setInterval> | null
  detector: ProcessDetector
  cwd: string
}

export class PtyManager {
  private sessions = new Map<string, Session>()
  private win: BrowserWindow

  constructor(win: BrowserWindow) {
    this.win = win
  }

  create(opts: { cwd?: string; env?: Record<string, string> }): string {
    const sessionId = uuidv4()
    const shell = process.platform === 'win32'
      ? 'cmd.exe'
      : (process.env.SHELL ?? '/bin/bash')

    const cwd = opts.cwd ?? process.env.HOME ?? '/'

    const isZsh = shell.endsWith('zsh')
    const promptEnv = isZsh
      ? { ZDOTDIR: createZdotdir() }
      : { PS1: ' ', PROMPT: ' ' }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        ...promptEnv,
        ...opts.env,
      },
    })

    const detector = new ProcessDetector()
    const session: Session = {
      id: sessionId,
      pty: ptyProcess,
      buffer: [],
      flushTimer: null,
      detector,
      cwd,
    }

    // Buffer data and flush every 4ms
    ptyProcess.onData((data) => {
      session.buffer.push(data)

      if (!session.flushTimer) {
        session.flushTimer = setInterval(() => {
          if (session.buffer.length > 0) {
            const chunk = session.buffer.join('')
            session.buffer = []
            if (!this.win.isDestroyed()) {
              this.win.webContents.send('pty:data', sessionId, chunk)
            }

            // Check for AI process signatures
            const result = detector.detect(chunk)
            if (result === 'detected' && !this.win.isDestroyed()) {
              const ai = detector.getCurrentAI()
              if (ai) {
                this.win.webContents.send('pty:ai-detected', sessionId, ai)
              }
            } else if (result === 'exited' && !this.win.isDestroyed()) {
              this.win.webContents.send('pty:ai-exited', sessionId)
            }
          }
        }, 4)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      if (session.flushTimer) {
        clearInterval(session.flushTimer)
      }
      if (!this.win.isDestroyed()) {
        this.win.webContents.send('pty:exit', sessionId, exitCode ?? 0)
      }
      this.sessions.delete(sessionId)
    })

    this.sessions.set(sessionId, session)
    return sessionId
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.pty.write(data)
    }
  }

  private resizeTimers = new Map<string, ReturnType<typeof setTimeout>>()

  resize(sessionId: string, cols: number, rows: number): void {
    const existing = this.resizeTimers.get(sessionId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      const session = this.sessions.get(sessionId)
      if (session) {
        session.pty.resize(cols, rows)
      }
      this.resizeTimers.delete(sessionId)
    }, 50)

    this.resizeTimers.set(sessionId, timer)
  }

  async kill(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      if (session.flushTimer) {
        clearInterval(session.flushTimer)
      }
      session.pty.kill()
      this.sessions.delete(sessionId)
    }
  }

  killAll(): void {
    for (const [id] of this.sessions) {
      this.kill(id)
    }
  }
}
