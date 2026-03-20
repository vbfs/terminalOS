import { create } from 'zustand'
import type { Session, ProcessStatus } from '../types/session'
import type { AIProcess } from '../types/ipc'

interface SessionsState {
  sessions: Map<string, Session>
  sessionOrder: string[]
  focusedSessionId: string | null

  addSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  updateStatus: (sessionId: string, status: ProcessStatus, exitCode?: number) => void
  updateCwd: (sessionId: string, cwd: string) => void
  setAiProcess: (sessionId: string, ai: AIProcess | null) => void
  updateTokens: (sessionId: string, tokens: number) => void
  setAlert: (sessionId: string, message: string | null) => void
  updateName: (sessionId: string, name: string) => void
  setFocusedSession: (sessionId: string) => void
  rotateSession: () => void

  getSession: (sessionId: string) => Session | undefined
  getActiveSessions: () => Session[]
  getOrderedSessions: () => Session[]
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: new Map(),
  sessionOrder: [],
  focusedSessionId: null,

  addSession: (session) =>
    set((state) => {
      const next = new Map(state.sessions)
      next.set(session.id, session)
      return {
        sessions: next,
        sessionOrder: [...state.sessionOrder, session.id],
        focusedSessionId: state.focusedSessionId ?? session.id,
      }
    }),

  removeSession: (sessionId) =>
    set((state) => {
      const next = new Map(state.sessions)
      next.delete(sessionId)
      const order = state.sessionOrder.filter((id) => id !== sessionId)
      const focused =
        state.focusedSessionId === sessionId ? (order[0] ?? null) : state.focusedSessionId
      return { sessions: next, sessionOrder: order, focusedSessionId: focused }
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

  updateTokens: (sessionId, tokens) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state
      const next = new Map(state.sessions)
      next.set(sessionId, { ...session, tokens })
      return { sessions: next }
    }),

  setAlert: (sessionId, message) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state
      const next = new Map(state.sessions)
      next.set(sessionId, { ...session, alertMessage: message })
      return { sessions: next }
    }),

  updateName: (sessionId, name) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state
      const next = new Map(state.sessions)
      next.set(sessionId, { ...session, name })
      return { sessions: next }
    }),

  setFocusedSession: (sessionId) => set({ focusedSessionId: sessionId }),

  rotateSession: () =>
    set((state) => {
      const { sessionOrder, focusedSessionId } = state
      if (sessionOrder.length === 0) return state
      const idx = focusedSessionId ? sessionOrder.indexOf(focusedSessionId) : -1
      const nextIdx = (idx + 1) % sessionOrder.length
      return { focusedSessionId: sessionOrder[nextIdx] }
    }),

  getSession: (sessionId) => get().sessions.get(sessionId),

  getActiveSessions: () =>
    Array.from(get().sessions.values()).filter((s) => s.status === 'running'),

  getOrderedSessions: () => {
    const { sessions, sessionOrder } = get()
    return sessionOrder
      .map((id) => sessions.get(id))
      .filter((s): s is Session => s !== undefined)
  },
}))
