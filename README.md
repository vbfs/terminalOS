<div align="center">

<img src="build/icon.png" alt="aiTerm Logo" width="96" />

# aiTerm

**The terminal built for AI-native developers.**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

</div>

---

## The Problem

AI coding tools like Claude Code, Aider, and OpenCode are becoming central to how developers work — but your terminal wasn't built for them.

Running an AI session today means:

- **No visibility into token consumption** — you discover your API bill at the end of the month.
- **No way to tell when AI is "thinking"** — your terminal looks the same whether AI is running or idle.
- **Context switching hell** — juggling docs, code files, and multiple AI sessions across different windows.
- **Generic terminals** that treat AI tool output as noise — no structured parsing, no error surfacing, no smart detection.

You're using a 1980s tool to run 2025 software.

---

## What aiTerm Does

aiTerm is a **desktop terminal multiplexer purpose-built for AI coding workflows**. It understands AI tools natively — detecting when they're running, tracking how much you're spending, and giving you a workspace that matches the way AI-assisted development actually works.

> Think iTerm2, but redesigned from scratch around Claude Code, Aider, and OpenCode.

---

## Core Features

### AI-Aware Sessions
Every terminal pane detects when an AI coding tool is running. A live badge shows which tool is active (`Claude`, `Aider`, `OpenCode`, `Continue`) with instant visual feedback when a session starts or ends. No more guessing if your AI is still processing.

### Real-Time Token Tracking
aiTerm parses token usage directly from CLI output — no API key required, no external service. Token counts and estimated USD cost are surfaced in the status bar as you work, so you always know your exact spend per session.

### API Error Alerts
Detects and surfaces common AI API errors (invalid keys, model not found, auth conflicts) as visual alerts inside the pane — before they silently fail and waste your time.

### Multi-Pane Workspace
Split your workspace horizontally or vertically. Run Claude in one pane, your test suite in another, and a markdown doc in a third — all in a single window. The full layout — tabs, pane splits, ratios, and active pane — is automatically saved and restored on every launch.

### Integrated Markdown Editor
A built-in file editor with live preview — designed for reviewing AI-generated docs, writing prompts, and editing code without leaving your terminal. Supports Markdown and source files with syntax highlighting.

### Command Palette
Open anything instantly with `⌘K`. Launch AI tools, split panes, switch tabs, open folders — all from a fuzzy-search command palette without touching the mouse.

### Workspace Management
Set a root folder and get a persistent file browser, git branch tracking in the status bar, and quick access to recent workspaces. Your context is always one click away.

---

## Who This Is For

### Primary Audience — AI-Native Engineers

Developers who use AI coding tools **every day** as a core part of their workflow. They're past the "let me try this AI thing" phase — Claude Code or Aider is open all day, on real production codebases.

**Their pain:** Standard terminals weren't built for this. They're duct-taping iTerm + Notes + a browser tab to manage their AI sessions.

**Why aiTerm:** One purpose-built workspace that gives them visibility and control over AI sessions without changing their terminal habits.

---

### Secondary Audience — Engineering Teams Adopting AI Tooling

Team leads and senior engineers rolling out AI coding tools across their org. They care about:
- **Cost predictability**: Token tracking helps engineers self-regulate API usage.
- **Workflow consistency**: A shared tool creates a consistent AI dev experience across the team.
- **Onboarding**: Built-in AI launchers lower the barrier for engineers new to CLI-based AI tools.

---

### Who This Is NOT For (Yet)

- Developers who only use AI through browser-based IDEs (Cursor, GitHub Copilot in VS Code).
- Non-technical users — this is a power-user terminal tool.
- Teams already satisfied with Warp AI or Ghostty — though aiTerm goes deeper on AI-specific tooling.

---

## Why aiTerm vs. Alternatives

| | aiTerm | iTerm2 / Warp | VS Code Terminal | AI IDEs (Cursor) |
|---|---|---|---|---|
| Native AI tool detection | ✅ | ❌ | ❌ | Partial |
| Real-time token tracking | ✅ | ❌ | ❌ | ❌ |
| API error alerts | ✅ | ❌ | ❌ | ❌ |
| Multi-pane AI sessions | ✅ | Manual | Manual | ❌ |
| Integrated markdown editor | ✅ | ❌ | Extension | ❌ |
| Built for CLI AI tools | ✅ | ❌ | ❌ | ❌ |
| Works with any AI tool | ✅ | — | — | ❌ (locked in) |

The key distinction: Warp and others add AI **to** a terminal. aiTerm is a terminal built **for** AI.

---

## Installation

### Download (Recommended)

Download the latest release for your platform from the [Releases page]().

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon + Intel) | `.dmg` universal binary |
| Windows | `.exe` NSIS installer |
| Linux | `.AppImage` |

### Build from Source

**Requirements:** Node.js 18+, npm 9+

```bash
git clone https://github.com/your-org/aiterm
cd aiterm
npm install
npm run rebuild    # Compiles native terminal module
npm run build      # Production build
npm run dist       # Package for your platform
```

---

## Getting Started

1. **Open a folder** — use `⌘O` or the command palette to set your workspace root.
2. **Launch an AI tool** — press `⌘⇧C` for Claude Code, `⌘⇧O` for OpenCode, or type the command manually.
3. **Watch the badge appear** — aiTerm detects the AI process and shows a live status indicator.
4. **Split your workspace** — `⌘D` to split right, `⌘↓` to split below. Run your tests alongside AI.
5. **Track tokens** — token usage appears in the status bar as your AI session runs.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `⌘T` | New tab |
| `⌘D` | Split pane right |
| `⌘↓` | Split pane below |
| `⌘W` | Close pane |
| `⌘M` | Open markdown editor |
| `⌘⇧C` | Launch Claude Code |
| `⌘⇧O` | Launch OpenCode |
| `⌘O` | Open folder |
| `⌘S` | Save file (in editor) |

> On Windows/Linux, replace `⌘` with `Ctrl`.

---

## Tech Stack

- **Electron 33** — cross-platform desktop runtime
- **React 19 + TypeScript** — UI
- **XTerm.js** — terminal emulator
- **node-pty** — native PTY (pseudo-terminal) management
- **Zustand** — state management
- **Vite** — build tooling

---

## Roadmap

The following are areas actively being explored based on developer feedback:

- [ ] **Multi-model token display** — differentiate input vs. output token costs
- [ ] **Session history and replay** — review past AI sessions
- [ ] **Prompt scratchpad** — dedicated pane for drafting and reusing prompts
- [ ] **Team token budgets** — per-project spend limits with alerts
- [ ] **Plugin API** — extend aiTerm with custom AI tool integrations

---

## Contributing

Contributions are welcome. Please open an issue before submitting a PR for significant changes.

```bash
npm run dev    # Start development environment with hot reload
```

---

## License

MIT © aiTerm

---

<div align="center">

**Built for the developers who run AI all day.**

</div>
