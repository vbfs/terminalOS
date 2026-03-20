import type { AIProcess } from './ipc'

export type ProcessStatus = 'running' | 'exited' | 'error'

export interface Session {
  id: string
  paneId: string
  cwd: string
  status: ProcessStatus
  exitCode?: number
  aiProcess: AIProcess | null
  createdAt: number
}
