import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron'
import path from 'path'
import { WindowState } from './window-state'
import { PtyManager } from './pty-manager'
import { FsWatcher } from './fs-watcher'
import { VersionsManager } from './versions-manager'

// Must be called before app.ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { secure: true, supportFetchAPI: true, stream: true } },
])

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let ptyManager: PtyManager
let fsWatcher: FsWatcher
let versionsManager: VersionsManager

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false
  }
  return false
}

function createWindow() {
  protocol.handle('localfile', (request) => {
    const filePath = new URL(request.url).pathname
    return net.fetch('file://' + filePath)
  })

  const windowState = new WindowState()
  const bounds = windowState.get()

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 640,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    trafficLightPosition: { x: 12, y: 9 },
    backgroundColor: '#090909',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false,
    },
  })

  ptyManager = new PtyManager(mainWindow)
  fsWatcher = new FsWatcher(mainWindow)
  versionsManager = new VersionsManager()

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('resize', () => {
    windowState.save(mainWindow!)
  })

  mainWindow.on('move', () => {
    windowState.save(mainWindow!)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  setupIpcHandlers()
}

function setupIpcHandlers() {
  // PTY handlers
  ipcMain.handle('pty:create', async (_, opts: { cwd?: string; env?: Record<string, string> }) => {
    return ptyManager.create(opts)
  })

  ipcMain.on('pty:write', (_, sessionId: string, data: string) => {
    ptyManager.write(sessionId, data)
  })

  ipcMain.on('pty:resize', (_, sessionId: string, cols: number, rows: number) => {
    ptyManager.resize(sessionId, cols, rows)
  })

  ipcMain.handle('pty:kill', async (_, sessionId: string) => {
    return ptyManager.kill(sessionId)
  })

  // FS handlers
  ipcMain.handle('fs:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    return fsWatcher.readDir(dirPath)
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    return fsWatcher.readFile(filePath)
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    return fsWatcher.writeFile(filePath, content)
  })

  ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
    return fsWatcher.mkdir(dirPath)
  })

  ipcMain.handle('fs:rename', async (_, src: string, dest: string) => {
    return fsWatcher.rename(src, dest)
  })

  ipcMain.handle('fs:copyExternal', async (_, srcPath: string, destDir: string) => {
    return fsWatcher.copyExternal(srcPath, destDir)
  })

  ipcMain.handle('fs:delete', async (_, targetPath: string) => {
    return fsWatcher.delete(targetPath)
  })

  ipcMain.handle('fs:writeBinaryFile', async (_, filePath: string, data: ArrayBuffer) => {
    const { promises: fs } = await import('fs')
    await fs.writeFile(filePath, Buffer.from(data))
  })

  ipcMain.on('fs:setWatchRoot', (_, rootPath: string) => {
    fsWatcher.setWatchRoot(rootPath)
  })

  // App handlers
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion()
  })

  ipcMain.handle('app:getGitBranch', async (_, cwd: string) => {
    const { execSync } = await import('child_process')
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim()
      return branch
    } catch {
      return null
    }
  })

  ipcMain.handle('app:checkForUpdates', async () => {
    try {
      const res = await net.fetch('https://api.github.com/repos/vbfs/terminalOS/releases/latest', {
        headers: { 'User-Agent': 'aiTerm-updater' },
      })
      if (!res.ok) return null
      const data = await res.json() as { tag_name: string; html_url: string }
      const latest = data.tag_name.replace(/^v/, '')
      const current = app.getVersion()
      return semverGt(latest, current) ? { version: latest, url: data.html_url } : null
    } catch {
      return null
    }
  })

  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  // Shell operations
  ipcMain.on('shell:openPath', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.on('shell:openInFinder', (_, folderPath: string) => {
    shell.openPath(folderPath)
  })

  ipcMain.on('shell:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })

  // Version history handlers
  ipcMain.handle('fs:versions:save', async (_, filePath: string, content: string) => {
    return versionsManager.saveVersion(filePath, content)
  })

  ipcMain.handle('fs:versions:list', async (_, filePath: string) => {
    return versionsManager.listVersions(filePath)
  })

  ipcMain.handle('fs:versions:get', async (_, filePath: string, versionId: string) => {
    return versionsManager.getVersion(filePath, versionId)
  })
}

app.whenReady().then(createWindow)

app.on('before-quit', () => {
  ptyManager?.killAll()
  fsWatcher?.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
