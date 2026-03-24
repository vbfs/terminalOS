<div align="center">

<img src="public/icon.png" alt="terminalOS Logo" width="96" />

# terminalOS

**The terminal built for AI-native developers.**

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](package.json)
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

## What terminalOS Does

terminalOS is a **desktop terminal multiplexer purpose-built for AI coding workflows**. It understands AI tools natively — detecting when they're running, tracking how much you're spending, and giving you a workspace that matches the way AI-assisted development actually works.

> Think iTerm2, but redesigned from scratch around Claude Code, Aider, and OpenCode.

---

## Core Features

### AI-Aware Session Detection

Every terminal pane detects when an AI coding tool is running. A live color-coded badge shows which tool is active with instant visual feedback when a session starts or ends.

| Tool        | Badge Color      |
| ----------- | ---------------- |
| Claude Code | Tan `#D4A27F`    |
| OpenCode    | Blue `#7FB5D4`   |
| Aider       | Purple `#A27FD4` |
| Continue    | Green `#7FD4A2`  |

Detection works by scanning PTY output directly — no process polling, no shell hooks required. A 3-second grace period prevents false positives when TUI input prompts appear at startup.

---

### Real-Time Token Tracking & Cost Estimation

terminalOS parses token usage directly from CLI output — **no API key required, no external service**. Token counts and estimated USD cost are surfaced in the status bar as you work.

**Supported output formats (all tools, automatically detected):**

| Format   | Example               |
| -------- | --------------------- |
| OpenCode | `64,101 31%`          |
| Generic  | `↑ 5.2k tokens`       |
| Claude   | `tokens used: 12,345` |
| Aider    | `(5.2k tokens)`       |

**Built-in model pricing:**

| Model                   | Price per 1M tokens |
| ----------------------- | ------------------- |
| Claude Opus 4 / 4.5     | $15.00              |
| Claude Sonnet 4.5 / 4.6 | $3.00               |
| Claude Haiku 4.5        | $0.80               |

The status bar shows two counters simultaneously: **session tokens** (focused pane only) and **workspace tokens** (all panes in the active tab).

---

### API Error Alerts

Detects and surfaces common AI API errors as visual alerts inside the pane — before they silently fail and waste your time:

- Invalid or missing API key
- Model not found (404)
- Authentication token conflicts (`ANTHROPIC_AUTH_TOKEN` vs `ANTHROPIC_API_KEY`)

---

### Multi-Pane Workspace

Split your workspace horizontally or vertically into an unlimited 2D pane tree. Run Claude in one pane, your test suite in another, and a markdown doc in a third — all in a single window.

- **Drag-to-resize** split handles between panes
- **Multiple tabs** — each with its own independent layout
- **Auto-save** — layout (splits, ratios, active pane) saved automatically every 500ms
- **Full restore** — exact layout reconstructed on every launch

---

### Integrated Markdown Editor

A built-in file editor with live preview designed for reviewing AI-generated docs, editing prompts, and working with code files without leaving your terminal.

- **Live markdown preview** — rendered side-by-side as you type
- **Syntax highlighting** for 25+ languages (TypeScript, JavaScript, Python, Rust, Go, C/C++, and more)
- **File browser** — navigate directories, open files with a single click
- **File management** — create and rename files and folders inline
- **Drag-and-drop** file operations within the browser

---

### Command Palette

Open anything instantly with `⌘K`. A fuzzy-search interface with score-based ranking covers every action in the app — no mouse required.

**Available command categories:**

- Pane operations (split right, split below, close)
- Tab management (new workspace)
- AI tool launchers (Claude Code, OpenCode, Aider)
- Markdown editor toggle
- Folder and workspace management
- Settings
- Recent folders (up to 10, instantly accessible)

---

### Terminal Engine

Built on XTerm.js with full modern terminal support:

- **Full ANSI/256-color/truecolor** escape sequence rendering
- **5,000-line scrollback** buffer per pane
- **Clickable URLs** — detected and linked automatically
- **In-terminal search** — find text within any pane's output
- **Auto-resize** — panes reflow instantly on window or split resize
- **Mouse selection → clipboard** — selected text is auto-copied
- **Font support:** JetBrains Mono, Meslo LGS NF, Hack Nerd Font

---

### Workspace Management

- **Root folder** — set once, persists across launches
- **Git branch** — current branch shown in the status bar
- **Conda environment** — active conda env detected and displayed
- **Recent folders** — last 10 workspaces accessible from the command palette
- **CWD tracking** — current working directory always visible in the status bar

---

## Who This Is For

### Primary Audience — AI-Native Engineers

Developers who use AI coding tools **every day** as a core part of their workflow. They're past the "let me try this AI thing" phase — Claude Code or Aider is open all day, on real production codebases.

**Their pain:** Standard terminals weren't built for this. They're duct-taping iTerm + Notes + a browser tab to manage their AI sessions.

**Why terminalOS:** One purpose-built workspace that gives them visibility and control over AI sessions without changing their terminal habits.

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
- Teams already satisfied with Warp AI or Ghostty — though terminalOS goes deeper on AI-specific tooling.

---

## Why terminalOS vs. Alternatives

|                            | terminalOS | iTerm2 / Warp | VS Code Terminal | AI IDEs (Cursor) |
| -------------------------- | ---------- | ------------- | ---------------- | ---------------- |
| Native AI tool detection   | ✅         | ❌            | ❌               | Partial          |
| Real-time token tracking   | ✅         | ❌            | ❌               | ❌               |
| API error alerts           | ✅         | ❌            | ❌               | ❌               |
| Multi-pane AI sessions     | ✅         | Manual        | Manual           | ❌               |
| Integrated markdown editor | ✅         | ❌            | Extension        | ❌               |
| Built for CLI AI tools     | ✅         | ❌            | ❌               | ❌               |
| Works with any AI tool     | ✅         | —             | —                | ❌ (locked in)   |

The key distinction: Warp and others add AI **to** a terminal. terminalOS is a terminal built **for** AI.

---

## Installation

### Download (Recommended)

Download the latest release for your platform from the [Releases page]().

| Platform                      | Download                |
| ----------------------------- | ----------------------- |
| macOS (Apple Silicon + Intel) | `.dmg` universal binary |
| Windows                       | `.exe` NSIS installer   |
| Linux                         | `.AppImage`             |

### Build from Source

**Requirements:** Node.js 18+, npm 9+

```bash
git clone https://github.com/your-org/terminalOS
cd terminalOS
npm install
npm run rebuild    # Compiles native terminal module
npm run build      # Production build
npm run dist       # Package for your platform
```

**Development (hot reload):**

```bash
npm run dev
```

---

## Getting Started

1. **Open a folder** — use `⌘O` or the command palette to set your workspace root.
2. **Launch an AI tool** — press `⌘⇧C` for Claude Code, `⌘⇧O` for OpenCode, or type the command manually.
3. **Watch the badge appear** — terminalOS detects the AI process and shows a live status indicator.
4. **Split your workspace** — `⌘D` to split right, `⌘⇧D` to split below. Run your tests alongside AI.
5. **Track tokens** — token usage and estimated cost appear in the status bar as your AI session runs.

---

## Keyboard Shortcuts

| Shortcut | Action                |
| -------- | --------------------- |
| `⌘K`     | Open command palette  |
| `⌘T`     | New tab / workspace   |
| `⌘D`     | Split pane right      |
| `⌘⇧D`    | Split pane below      |
| `⌘W`     | Close active pane     |
| `⌘M`     | Open markdown editor  |
| `⌘⇧C`    | Launch Claude Code    |
| `⌘⇧O`    | Launch OpenCode       |
| `⌘O`     | Open folder           |
| `⌘S`     | Save file (in editor) |

> On Windows/Linux, replace `⌘` with `Ctrl`.

---

## Tech Stack

| Layer               | Technology            |
| ------------------- | --------------------- |
| Desktop runtime     | Electron 33           |
| UI framework        | React 19 + TypeScript |
| Build tooling       | Vite 6                |
| Terminal emulator   | XTerm.js 5.3          |
| PTY management      | node-pty              |
| State management    | Zustand 5             |
| File watching       | Chokidar 4            |
| Markdown rendering  | Marked 17             |
| Syntax highlighting | Highlight.js 11       |
| Auto-updater        | electron-updater      |
| Virtualized lists   | React Window          |

---

## Roadmap

The following are areas actively being explored based on developer feedback:

- [ ] **Multi-model token display** — differentiate input vs. output token costs
- [ ] **Session history and replay** — review past AI sessions
- [ ] **Prompt scratchpad** — dedicated pane for drafting and reusing prompts
- [ ] **Team token budgets** — per-project spend limits with alerts
- [ ] **Plugin API** — extend terminalOS with custom AI tool integrations

---

## Contributing

Contributions are welcome. Please open an issue before submitting a PR for significant changes.

```bash
npm run dev    # Start development environment with hot reload
```

---

## License

MIT © terminalOS

---

<div align="center">

**Built for the developers who run AI all day.**

</div>
