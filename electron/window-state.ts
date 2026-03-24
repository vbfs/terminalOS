import { BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'

interface WindowBounds {
  x?: number
  y?: number
  width: number
  height: number
}

export class WindowState {
  private filePath: string
  private bounds: WindowBounds = { width: 1280, height: 800 }

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'window-state.json')
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8')
        this.bounds = JSON.parse(data)
      }
    } catch {
      // Use defaults
    }
  }

  get(): WindowBounds {
    return this.bounds
  }

  save(win: BrowserWindow): void {
    if (!win.isMaximized() && !win.isMinimized()) {
      const bounds = win.getBounds()
      this.bounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }
      try {
        fs.writeFileSync(this.filePath, JSON.stringify(this.bounds), 'utf8')
      } catch {
        // Ignore write errors
      }
    }
  }
}
