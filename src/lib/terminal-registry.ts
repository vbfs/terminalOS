import { Terminal } from "@xterm/xterm"
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'

interface CachedTerminal {
  term: Terminal
  fitAddon: FitAddon
  searchAddon: SearchAddon
  lastSize: { cols: number; rows: number }
}

const registry = new Map<string, CachedTerminal>()

export function saveTerminal(sessionId: string, entry: CachedTerminal): void {
  registry.set(sessionId, entry)
}

export function takeTerminal(sessionId: string): CachedTerminal | undefined {
  const entry = registry.get(sessionId)
  if (entry) registry.delete(sessionId)
  return entry
}

export function disposeTerminal(sessionId: string): void {
  const entry = registry.get(sessionId)
  if (entry) {
    entry.term.dispose()
    registry.delete(sessionId)
  }
}
