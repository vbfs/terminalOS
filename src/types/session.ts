import type { AIProcess } from './ipc'

export type ProcessStatus = 'running' | 'exited' | 'error'

export interface Session {
  id: string
  paneId: string
  name: string
  cwd: string
  condaEnv: string | null
  status: ProcessStatus
  exitCode?: number
  aiProcess: AIProcess | null
  tokens: number
  model: string | null
  costUsd: number
  alertMessage: string | null
  createdAt: number
}

export type AgentType = 'CLAUDE' | 'OC' | 'SHELL'
export type DotState = 'running' | 'waiting' | 'error' | 'idle'

export function getAgentType(session: Session): AgentType {
  if (!session.aiProcess) return 'SHELL'
  const name = session.aiProcess.name.toLowerCase()
  if (name.includes('claude')) return 'CLAUDE'
  if (name.includes('opencode') || name === 'oc' || name.includes(' oc')) return 'OC'
  return 'SHELL'
}

export function getDotState(session: Session): DotState {
  if (session.status === 'error') return 'error'
  if (session.status === 'exited') return 'idle'
  if (session.aiProcess !== null) return 'waiting'
  return 'running'
}
