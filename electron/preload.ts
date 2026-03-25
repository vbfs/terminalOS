import { contextBridge, ipcRenderer } from 'electron'

type Unsubscribe = () => void

const api = {
  pty: {
    create: (opts: { cwd?: string; env?: Record<string, string> }): Promise<string> =>
      ipcRenderer.invoke('pty:create', opts),
    write: (sessionId: string, data: string): void =>
      ipcRenderer.send('pty:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number): void =>
      ipcRenderer.send('pty:resize', sessionId, cols, rows),
    kill: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('pty:kill', sessionId),
    onData: (cb: (sessionId: string, data: string) => void): Unsubscribe => {
      const handler = (_: Electron.IpcRendererEvent, sessionId: string, data: string) =>
        cb(sessionId, data)
      ipcRenderer.on('pty:data', handler)
      return () => ipcRenderer.removeListener('pty:data', handler)
    },
    onExit: (cb: (sessionId: string, code: number) => void): Unsubscribe => {
      const handler = (_: Electron.IpcRendererEvent, sessionId: string, code: number) =>
        cb(sessionId, code)
      ipcRenderer.on('pty:exit', handler)
      return () => ipcRenderer.removeListener('pty:exit', handler)
    },
    onAiDetected: (cb: (sessionId: string, aiProcess: { name: string; color: string }) => void): Unsubscribe => {
      const handler = (_: Electron.IpcRendererEvent, sessionId: string, aiProcess: { name: string; color: string }) =>
        cb(sessionId, aiProcess)
      ipcRenderer.on('pty:ai-detected', handler)
      return () => ipcRenderer.removeListener('pty:ai-detected', handler)
    },
    onAiExited: (cb: (sessionId: string) => void): Unsubscribe => {
      const handler = (_: Electron.IpcRendererEvent, sessionId: string) => cb(sessionId)
      ipcRenderer.on('pty:ai-exited', handler)
      return () => ipcRenderer.removeListener('pty:ai-exited', handler)
    },
  },
  fs: {
    openFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('fs:openFolder'),
    readDir: (dirPath: string): Promise<Array<{ name: string; path: string; isDirectory: boolean; ext: string; size?: number }>> =>
      ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    writeBinaryFile: (filePath: string, data: ArrayBuffer): Promise<void> =>
      ipcRenderer.invoke('fs:writeBinaryFile', filePath, data),
    mkdir: (dirPath: string): Promise<void> =>
      ipcRenderer.invoke('fs:mkdir', dirPath),
    rename: (src: string, dest: string): Promise<void> =>
      ipcRenderer.invoke('fs:rename', src, dest),
    copyExternal: (srcPath: string, destDir: string): Promise<void> =>
      ipcRenderer.invoke('fs:copyExternal', srcPath, destDir),
    delete: (targetPath: string): Promise<void> =>
      ipcRenderer.invoke('fs:delete', targetPath),
    setWatchRoot: (rootPath: string): void =>
      ipcRenderer.send('fs:setWatchRoot', rootPath),
    onWatch: (cb: (event: { type: string; path: string }) => void): Unsubscribe => {
      const handler = (_: Electron.IpcRendererEvent, event: { type: string; path: string }) =>
        cb(event)
      ipcRenderer.on('fs:watch', handler)
      return () => ipcRenderer.removeListener('fs:watch', handler)
    },
    versions: {
      save: (filePath: string, content: string) =>
        ipcRenderer.invoke('fs:versions:save', filePath, content),
      list: (filePath: string) =>
        ipcRenderer.invoke('fs:versions:list', filePath),
      get: (filePath: string, versionId: string) =>
        ipcRenderer.invoke('fs:versions:get', filePath, versionId),
    },
  },
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:getVersion'),
    getGitBranch: (cwd: string): Promise<string | null> =>
      ipcRenderer.invoke('app:getGitBranch', cwd),
    checkForUpdates: (): Promise<{ version: string; url: string } | null> =>
      ipcRenderer.invoke('app:checkForUpdates'),
    onFocus: (cb: () => void): Unsubscribe => {
      ipcRenderer.on('app:focus', cb)
      return () => ipcRenderer.removeListener('app:focus', cb)
    },
    onBlur: (cb: () => void): Unsubscribe => {
      ipcRenderer.on('app:blur', cb)
      return () => ipcRenderer.removeListener('app:blur', cb)
    },
  },
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
  },
  shell: {
    openPath: (filePath: string): void => ipcRenderer.send('shell:openPath', filePath),
    openInFinder: (folderPath: string): void => ipcRenderer.send('shell:openInFinder', folderPath),
    openExternal: (url: string): void => ipcRenderer.send('shell:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
