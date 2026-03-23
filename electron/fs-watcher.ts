import { BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import chokidar, { FSWatcher } from 'chokidar'

interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  ext: string
  size?: number
}

export class FsWatcher {
  private win: BrowserWindow
  private watcher: FSWatcher | null = null
  private watchRoot: string | null = null

  constructor(win: BrowserWindow) {
    this.win = win
  }

  async readDir(dirPath: string): Promise<FsEntry[]> {
    // Validate path to prevent traversal
    const resolved = path.resolve(dirPath)

    const entries = await fs.readdir(resolved, { withFileTypes: true })
    const result: FsEntry[] = []

    for (const entry of entries) {
      const entryPath = path.join(resolved, entry.name)
      const isDirectory = entry.isDirectory()
      const ext = isDirectory ? '' : path.extname(entry.name).slice(1)
      const stat = isDirectory ? null : await fs.stat(entryPath).catch(() => null)

      result.push({
        name: entry.name,
        path: entryPath,
        isDirectory,
        ext,
        size: stat?.size,
      })
    }

    // Sort: directories first, then files, both alphabetically
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return result
  }

  async readFile(filePath: string): Promise<string> {
    const resolved = path.resolve(filePath)
    return fs.readFile(resolved, 'utf8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(filePath)
    await fs.writeFile(resolved, content, 'utf8')
  }

  async mkdir(dirPath: string): Promise<void> {
    const resolved = path.resolve(dirPath)
    await fs.mkdir(resolved, { recursive: true })
  }

  async rename(srcPath: string, destPath: string): Promise<void> {
    const src = path.resolve(srcPath)
    const dest = path.resolve(destPath)
    await fs.rename(src, dest)
  }

  setWatchRoot(rootPath: string): void {
    const resolved = path.resolve(rootPath)

    if (this.watchRoot === resolved) return

    this.watcher?.close()
    this.watchRoot = resolved

    this.watcher = chokidar.watch(resolved, {
      ignoreInitial: true,
      ignored: [
        /(^|[\/\\])\../,      // hidden files
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
      ],
      depth: 5,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    })

    const emit = (type: string, filePath: string) => {
      if (!this.win.isDestroyed()) {
        this.win.webContents.send('fs:watch', { type, path: filePath })
      }
    }

    this.watcher
      .on('add', (p) => emit('add', p))
      .on('addDir', (p) => emit('addDir', p))
      .on('change', (p) => emit('change', p))
      .on('unlink', (p) => emit('unlink', p))
      .on('unlinkDir', (p) => emit('unlinkDir', p))
  }

  close(): void {
    this.watcher?.close()
    this.watcher = null
  }
}
