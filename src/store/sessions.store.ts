import { create } from 'zustand'
import type { Session, ProcessStatus } from '../types/session'
import type { AIProcess } from '../types/ipc'

interface SessionsState {
  sessions: Map<string, Session>
  addSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  updateStatus: (sessionId: string, status: ProcessStatus, exitCode?: number) => void
  updateCwd: (sessionId: string, cwd: string) => void
  setAiProcess: (sessionId: string, ai: AIProcess | null) => void
  getSession: (sessionId: string) => Session | undefined
  getActiveSessions: () => Session[]
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: new Map(),

  addSession: (session) =>
    set((state) => {
      const next = new Map(state.sessions)
      next.set(session.id, session)
      return { sessions: next }
    }),

  removeSession: (sessionId) =>
    set((state) => {
      const next = new Map(state.sessions)
      next.delete(sessionId)
      return { sessions: next }
    }),

  updateStatus: (sessionId, status, exitCode) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state
      const next = new Map(state.sessions)
      next.set(sessionId, { ...session, status, exitCode })
      return { sessions: next }
    }),

  updateCwd: (sessionId, cwd) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state
      const next = new Map(state.sessions)
      next.set(sessionId, { ...session, cwd })
      return { sessions: next }
    }),

  setAiProcess: (sessionId, ai) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state
      const next = new Map(state.sessions)
      next.set(sessionId, { ...session, aiProcess: ai })
      return { sessions: next }
    }),

  getSession: (sessionId) => get().sessions.get(sessionId),

  getActiveSessions: () =>
    Array.from(get().sessions.values()).filter((s) => s.status === 'running'),
}))
