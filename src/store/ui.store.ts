import { create } from 'zustand'

interface UiState {
  copiedFlash: string | null
  shortcutRefOpen: boolean
  setCopied: (msg: string) => void
  setShortcutRefOpen: (open: boolean) => void
}

let flashTimer: ReturnType<typeof setTimeout> | null = null

export const useUiStore = create<UiState>((set) => ({
  copiedFlash: null,
  shortcutRefOpen: false,
  setCopied: (msg) => {
    if (flashTimer) clearTimeout(flashTimer)
    set({ copiedFlash: msg })
    flashTimer = setTimeout(() => {
      set({ copiedFlash: null })
      flashTimer = null
    }, 2000)
  },
  setShortcutRefOpen: (open) => set({ shortcutRefOpen: open }),
}))
