import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { WindowState } from './window-state'
import { PtyManager } from './pty-manager'
import { FsWatcher } from './fs-watcher'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let ptyManager: PtyManager
let fsWatcher: FsWatcher

function createWindow() {
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
