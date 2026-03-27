export interface PtyCreateOptions {
  cwd?: string
  env?: Record<string, string>
}

export interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  ext: string
  size?: number
  contentSize?: number
}

export interface VersionMeta {
  id: string
  version: number
  timestamp: number
}

export interface FsEvent {
  type: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
  path: string
}

export interface AIProcess {
  name: string
  color: string
}

export type Unsubscribe = () => void

export interface IpcApi {
  pty: {
    create: (opts: PtyCreateOptions) => Promise<string>
    write: (sessionId: string, data: string) => void
    resize: (sessionId: string, cols: number, rows: number) => void
    kill: (sessionId: string) => Promise<void>
    onData: (cb: (sessionId: string, data: string) => void) => Unsubscribe
    onExit: (cb: (sessionId: string, code: number) => void) => Unsubscribe
    onAiDetected: (cb: (sessionId: string, aiProcess: AIProcess) => void) => Unsubscribe
    onAiExited: (cb: (sessionId: string) => void) => Unsubscribe
  }
  fs: {
    openFolder: () => Promise<string | null>
    readDir: (path: string) => Promise<FsEntry[]>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<void>
    mkdir: (path: string) => Promise<void>
    rename: (src: string, dest: string) => Promise<void>
    copyExternal: (src: string, destDir: string) => Promise<void>
    writeBinaryFile: (filePath: string, data: ArrayBuffer) => Promise<void>
    delete: (path: string) => Promise<void>
    setWatchRoot: (path: string) => void
    onWatch: (cb: (event: FsEvent) => void) => Unsubscribe
    versions: {
      save: (filePath: string, content: string) => Promise<VersionMeta | null>
      list: (filePath: string) => Promise<VersionMeta[]>
      get: (filePath: string, versionId: string) => Promise<string | null>
    }
  }
  app: {
    getVersion: () => Promise<string>
    getGitBranch: (cwd: string) => Promise<string | null>
    checkForUpdates: () => Promise<{ version: string; url: string } | null>
    getPlatform: () => Promise<string>
    onFocus: (cb: () => void) => Unsubscribe
    onBlur: (cb: () => void) => Unsubscribe
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  shell: {
    openPath: (path: string) => void
    openInFinder: (path: string) => void
    openExternal: (url: string) => void
  }
}

declare global {
  interface Window {
    api: IpcApi
  }
}
