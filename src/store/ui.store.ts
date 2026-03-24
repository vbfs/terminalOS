import { create } from 'zustand'

interface UiState {
  copiedFlash: string | null
  setCopied: (msg: string) => void
}

let flashTimer: ReturnType<typeof setTimeout> | null = null

export const useUiStore = create<UiState>((set) => ({
  copiedFlash: null,
  setCopied: (msg) => {
    if (flashTimer) clearTimeout(flashTimer)
    set({ copiedFlash: msg })
    flashTimer = setTimeout(() => {
      set({ copiedFlash: null })
      flashTimer = null
    }, 2000)
  },
}))
