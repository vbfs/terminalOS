interface AIProcess {
  name: string
  color: string
}

const AI_SIGNATURES: Array<{ pattern: RegExp; name: string; color: string }> = [
  { pattern: /claude\s+code/i,   name: 'claude code',  color: '#D4A27F' },
  { pattern: /opencode/i,        name: 'opencode',     color: '#7FB5D4' },
  { pattern: /aider/i,           name: 'aider',        color: '#A27FD4' },
  { pattern: /continue/i,        name: 'continue',     color: '#7FD4A2' },
  { pattern: /\$\s*claude\b/,    name: 'claude code',  color: '#D4A27F' },
]

// Strip ANSI escape sequences before testing for shell prompt
const ANSI_RE = /\x1b\[[0-9;]*[mGKHFABCDJsu]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g

// Prompt character must be at the start of a line (with only optional surrounding whitespace).
// This prevents false positives from `>` in code examples, `$` in cost strings, etc.
const SHELL_PROMPT_PATTERN = /(?:^|\n)\s{0,6}[$%❯>]\s{0,2}$/

export class ProcessDetector {
  private slidingWindow = ''
  private readonly windowSize = 2048
  private currentAI: AIProcess | null = null
  private hasAI = false
  private detectedAt: number = 0
  // Grace period after detection before checking for exit. Prevents AI TUI input
  // prompts (e.g. opencode's "> " or "❯ ") from being misread as shell prompts.
  private readonly gracePeriodMs = 3000

  detect(data: string): 'detected' | 'exited' | null {
    this.slidingWindow = (this.slidingWindow + data).slice(-this.windowSize)

    if (!this.hasAI) {
      for (const sig of AI_SIGNATURES) {
        if (sig.pattern.test(this.slidingWindow)) {
          this.currentAI = { name: sig.name, color: sig.color }
          this.hasAI = true
          this.detectedAt = Date.now()
          return 'detected'
        }
      }
    } else {
      // Don't check for exit too soon after detection — AI TUI apps render their
      // own input prompts ("> ", "❯ ") immediately on startup, which would otherwise
      // trigger a false exit and cause a re-detect → token reset cycle.
      if (Date.now() - this.detectedAt < this.gracePeriodMs) return null
      // Check if returned to shell prompt — strip ANSI first to avoid false matches
      const plain = this.slidingWindow.replace(ANSI_RE, '')
      const lastLines = plain.split('\n').slice(-3).join('\n')
      if (SHELL_PROMPT_PATTERN.test(lastLines)) {
        this.currentAI = null
        this.hasAI = false
        return 'exited'
      }
    }

    return null
  }

  getCurrentAI(): AIProcess | null {
    return this.currentAI
  }

  reset(): void {
    this.slidingWindow = ''
    this.currentAI = null
    this.hasAI = false
  }
}
