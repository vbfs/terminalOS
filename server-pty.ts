/**
 * aiTerm Web Server
 * Serves the React SPA and exposes a WebSocket PTY bridge + REST filesystem API.
 *
 * Run in dev:   npm run dev:web
 * Run in prod:  node server-pty.js
 */

import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import * as http from 'http'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as os from 'os'
import * as pathModule from 'path'
import * as crypto from 'crypto'
import * as childProcess from 'child_process'
import * as pty from 'node-pty'
import { v4 as uuidv4 } from 'uuid'
import chokidar, { FSWatcher } from 'chokidar'
import { ProcessDetector } from './electron/process-detector'

// ============================================================
// Config
// ============================================================
// Use SERVER_PORT (not PORT) so it doesn't conflict with the Vite dev server's PORT env var
const PORT = parseInt(process.env.SERVER_PORT ?? '3001', 10)
const VERSIONS_DIR = pathModule.join(os.homedir(), '.aiterm', 'versions')

// ============================================================
// Zdotdir helper (same as electron/pty-manager.ts)
// ============================================================
function createZdotdir(): string {
  const zdotdir = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'aiterm-'))
  fs.writeFileSync(
    pathModule.join(zdotdir, '.zprofile'),
    [
      '# aiTerm: source real .zprofile (restores full PATH)',
      '[ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile"',
    ].join('\n'),
  )
  fs.writeFileSync(
    pathModule.join(zdotdir, '.zshrc'),
    [
      '# aiTerm: source real .zshrc first',
      'unset ZDOTDIR',
      '[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc"',
      '',
      '_aiterm_precmd() {',
      '  printf "\\n"',
      '  PROMPT=" "',
      '  RPROMPT=""',
      '  printf "\\033]9001;%s\\007" "${CONDA_DEFAULT_ENV:-}"',
      '}',
      'precmd_functions+=(_aiterm_precmd)',
      '',
      '_aiterm_preexec() {',
      '  printf "\\x1b[1A\\x1b[2K \\x1b[1m%s\\x1b[22m\\r\\n" "$1"',
      '}',
      'preexec_functions+=(_aiterm_preexec)',
      'PROMPT=" "',
      'RPROMPT=""',
    ].join('\n'),
  )
  return zdotdir
}

// ============================================================
// PTY session manager (callback-based, no BrowserWindow)
// ============================================================
interface PtySession {
  id: string
  pty: pty.IPty
  buffer: string[]
  flushTimer: ReturnType<typeof setTimeout> | null
  detector: ProcessDetector
}

const sessions = new Map<string, PtySession>()

type EventCallback = (type: string, payload: Record<string, unknown>) => void

function createPtySession(
  opts: { cwd?: string; env?: Record<string, string> },
  onEvent: EventCallback,
): string {
  const sessionId = uuidv4()
  const shell =
    process.platform === 'win32'
      ? 'cmd.exe'
      : (process.env.SHELL ?? '/bin/bash')
  const cwd = opts.cwd ?? process.env.HOME ?? '/'
  const isZsh = shell.endsWith('zsh')
  const promptEnv = isZsh
    ? { ZDOTDIR: createZdotdir() }
    : { PS1: ' ', PROMPT: ' ' }

  const shellArgs = process.platform === 'win32' ? [] : ['-l']
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: {
      ...(process.env as Record<string, string>),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      ...promptEnv,
      ...(opts.env ?? {}),
    },
  })

  const detector = new ProcessDetector()
  const session: PtySession = {
    id: sessionId,
    pty: ptyProcess,
    buffer: [],
    flushTimer: null,
    detector,
  }

  ptyProcess.onData((data) => {
    session.buffer.push(data)
    if (!session.flushTimer) {
      session.flushTimer = setTimeout(() => {
        const chunk = session.buffer.join('')
        session.buffer = []
        session.flushTimer = null
        onEvent('pty:data', { sessionId, data: chunk })
        const result = detector.detect(chunk)
        if (result === 'detected') {
          const ai = detector.getCurrentAI()
          if (ai) onEvent('pty:ai-detected', { sessionId, aiProcess: ai })
        } else if (result === 'exited') {
          onEvent('pty:ai-exited', { sessionId })
        }
      }, 1)
    }
  })

  ptyProcess.onExit(({ exitCode }) => {
    if (session.flushTimer) clearTimeout(session.flushTimer)
    onEvent('pty:exit', { sessionId, code: exitCode ?? 0 })
    sessions.delete(sessionId)
  })

  sessions.set(sessionId, session)
  return sessionId
}

// ============================================================
// Versions storage (~/.aiterm/versions/)
// ============================================================
const MAX_VERSIONS = 50

function versionsKey(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex')
}

async function loadVersions(filePath: string): Promise<any[]> {
  const vFile = pathModule.join(VERSIONS_DIR, `${versionsKey(filePath)}.json`)
  try {
    const raw = await fsPromises.readFile(vFile, 'utf8')
    return JSON.parse(raw).versions ?? []
  } catch {
    return []
  }
}

async function saveVersions(filePath: string, versions: any[]): Promise<void> {
  await fsPromises.mkdir(VERSIONS_DIR, { recursive: true })
  const vFile = pathModule.join(VERSIONS_DIR, `${versionsKey(filePath)}.json`)
  await fsPromises.writeFile(vFile, JSON.stringify({ filePath, versions }), 'utf8')
}

// ============================================================
// Express app
// ============================================================
const app = express()
app.use(express.json({ limit: '50mb' }))

// CORS (allow any origin in dev; lock down in prod as needed)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-ID')
  next()
})
app.options('*', (_req, res) => res.sendStatus(200))

// Serve built React app
const BUILD_DIR = pathModule.join(__dirname, 'build')
app.use(express.static(BUILD_DIR))

// ---- Version ----
const { version: appVersion } = JSON.parse(
  fs.readFileSync(pathModule.join(__dirname, 'package.json'), 'utf8'),
)
app.get('/api/version', (_req, res) => res.json({ version: appVersion }))

// ---- Home directory ----
app.get('/api/app/home', (_req, res) => res.json({ path: os.homedir() }))

// ---- Git branch ----
app.get('/api/app/git-branch', (req, res) => {
  const cwd = req.query.cwd as string
  if (!cwd) return res.json({ branch: null })
  childProcess.exec('git rev-parse --abbrev-ref HEAD', { cwd }, (err, stdout) => {
    res.json({ branch: err ? null : stdout.trim() })
  })
})

// ---- FS: readDir ----
app.get('/api/fs/dir', async (req, res) => {
  try {
    const resolved = pathModule.resolve(req.query.path as string)
    const entries = await fsPromises.readdir(resolved, { withFileTypes: true })
    const result = await Promise.all(
      entries.map(async (e) => {
        const p = pathModule.join(resolved, e.name)
        const isDir = e.isDirectory()
        const ext = isDir ? '' : pathModule.extname(e.name).slice(1).toLowerCase()
        const stat = isDir ? null : await fsPromises.stat(p).catch(() => null)
        return { name: e.name, path: p, isDirectory: isDir, ext, size: stat?.size }
      }),
    )
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: readFile ----
app.get('/api/fs/file', async (req, res) => {
  try {
    const content = await fsPromises.readFile(
      pathModule.resolve(req.query.path as string),
      'utf8',
    )
    res.json({ content })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: writeFile ----
app.post('/api/fs/file', async (req, res) => {
  try {
    await fsPromises.writeFile(pathModule.resolve(req.body.path), req.body.content, 'utf8')
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: writeBinaryFile ----
app.post('/api/fs/binary', async (req, res) => {
  try {
    await fsPromises.writeFile(
      pathModule.resolve(req.body.path),
      Buffer.from(req.body.base64 as string, 'base64'),
    )
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: mkdir ----
app.post('/api/fs/mkdir', async (req, res) => {
  try {
    await fsPromises.mkdir(pathModule.resolve(req.body.path), { recursive: true })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: rename ----
app.post('/api/fs/rename', async (req, res) => {
  try {
    await fsPromises.rename(
      pathModule.resolve(req.body.src),
      pathModule.resolve(req.body.dest),
    )
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: copyExternal ----
app.post('/api/fs/copy', async (req, res) => {
  try {
    const src = pathModule.resolve(req.body.src)
    const dest = pathModule.join(pathModule.resolve(req.body.destDir), pathModule.basename(src))
    await fsPromises.cp(src, dest, { recursive: true })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: delete ----
app.post('/api/fs/delete', async (req, res) => {
  try {
    await fsPromises.rm(pathModule.resolve(req.body.path), { recursive: true, force: true })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- Versions: save ----
app.post('/api/fs/versions/save', async (req, res) => {
  try {
    const { filePath, content } = req.body
    const versions = await loadVersions(filePath)
    if (versions.length > 0 && versions[versions.length - 1].content === content) {
      return res.json(null)
    }
    const nextVersion = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1
    const now = Date.now()
    const newV = {
      id: new Date(now).toISOString(),
      version: nextVersion,
      timestamp: now,
      content,
    }
    versions.push(newV)
    const pruned =
      versions.length > MAX_VERSIONS ? versions.slice(versions.length - MAX_VERSIONS) : versions
    await saveVersions(filePath, pruned)
    res.json({ id: newV.id, version: newV.version, timestamp: newV.timestamp })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- Versions: list ----
app.get('/api/fs/versions/list', async (req, res) => {
  try {
    const versions = await loadVersions(req.query.path as string)
    res.json(
      versions
        .map(({ id, version, timestamp }: any) => ({ id, version, timestamp }))
        .reverse(),
    )
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- Versions: get ----
app.get('/api/fs/versions/get', async (req, res) => {
  try {
    const versions = await loadVersions(req.query.path as string)
    const found = versions.find((v: any) => v.id === req.query.id)
    res.json({ content: found?.content ?? null })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ---- FS: pick-folder (native OS dialog) ----
app.get('/api/fs/pick-folder', async (_req, res) => {
  try {
    let cmd: string
    if (process.platform === 'darwin') {
      cmd = `osascript -e 'POSIX path of (choose folder with prompt "Select a folder:")'`
    } else if (process.platform === 'linux') {
      cmd = `zenity --file-selection --directory --title="Select a folder"`
    } else if (process.platform === 'win32') {
      cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Select a folder'; if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }"`
    } else {
      return res.json({ path: null, fallback: true })
    }
    const stdout = await new Promise<string>((resolve, reject) => {
      childProcess.exec(cmd, (err, out) => (err ? reject(err) : resolve(out)))
    })
    const picked = stdout.trim().replace(/\/$/, '')
    res.json({ path: picked || null, fallback: false })
  } catch {
    // User cancelled (osascript/zenity/powershell exit with error on cancel)
    res.json({ path: null, fallback: false })
  }
})

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(pathModule.join(BUILD_DIR, 'index.html'))
})

// ============================================================
// WebSocket Server — PTY bridge
// ============================================================
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/terminal' })

// Per-connection file watcher
const connWatchers = new Map<WebSocket, FSWatcher>()

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url!, 'http://localhost')
  const _userId = url.searchParams.get('userId') ?? 'anonymous'
  const connSessions = new Set<string>()

  function send(type: string, payload: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }))
    }
  }

  ws.on('message', (raw) => {
    let msg: any
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    switch (msg.type as string) {
      case 'pty:create': {
        const sessionId = createPtySession(
          msg.opts ?? {},
          (type, payload) => send(type, payload),
        )
        connSessions.add(sessionId)
        send('pty:created', { reqId: msg.reqId, sessionId })
        break
      }

      case 'pty:write': {
        sessions.get(msg.sessionId as string)?.pty.write(msg.data as string)
        break
      }

      case 'pty:resize': {
        const s = sessions.get(msg.sessionId as string)
        if (s) {
          try {
            s.pty.resize(msg.cols as number, msg.rows as number)
          } catch {}
        }
        break
      }

      case 'pty:kill': {
        const s = sessions.get(msg.sessionId as string)
        if (s) {
          if (s.flushTimer) clearTimeout(s.flushTimer)
          s.pty.kill()
          sessions.delete(msg.sessionId as string)
          connSessions.delete(msg.sessionId as string)
        }
        break
      }

      case 'fs:watch': {
        connWatchers.get(ws)?.close()
        const watchPath = pathModule.resolve(msg.path as string)
        const watcher = chokidar.watch(watchPath, {
          ignoreInitial: true,
          ignored: [/(^|[/\\])\../, /node_modules/, /\.git/, /dist/, /build/],
          depth: 5,
          awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 },
        })
        const emit = (type: string, p: string) =>
          send('fs:watch', { event: { type, path: p } })
        watcher
          .on('add', (p) => emit('add', p))
          .on('addDir', (p) => emit('addDir', p))
          .on('change', (p) => emit('change', p))
          .on('unlink', (p) => emit('unlink', p))
          .on('unlinkDir', (p) => emit('unlinkDir', p))
        connWatchers.set(ws, watcher)
        break
      }
    }
  })

  ws.on('close', () => {
    for (const sessionId of connSessions) {
      const s = sessions.get(sessionId)
      if (s) {
        if (s.flushTimer) clearTimeout(s.flushTimer)
        s.pty.kill()
        sessions.delete(sessionId)
      }
    }
    connWatchers.get(ws)?.close()
    connWatchers.delete(ws)
  })
})

server.listen(PORT, () => {
  console.log(`aiTerm server → http://localhost:${PORT}`)
})
