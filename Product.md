# terminalOS — Product Overview

**Terminal workspace built for AI-assisted development.**

---

## Who It's For

Professionals who run AI coding agents daily and feel the friction:

- Multiple VSCode windows open for different projects
- No visibility into how many tokens a session consumed
- Switching context between terminal, notes, and docs

---

## Core Features

### Multi-Pane Terminal

Split the screen horizontally or vertically — as many panes as needed. Each pane is an independent shell session. Layouts are saved automatically and restored on next launch. Panes can be minimized to a thin strip to save space.

### Multi-Workspace Tabs

Each tab is a fully independent workspace with its own pane layout. Name tabs by project. Switch between them without losing terminal state.

### AI Process Detection

terminalOS detects when Claude Code, OpenCode, Aider, or Continue is running inside a pane — no config needed. A colored badge appears on the pane header identifying which AI tool is active.

### Token Tracking

Parses token usage directly from AI CLI output in real time. Shows:

- **Session tokens** — tokens used in the focused pane since launch
- **Workspace tokens** — total tokens across all panes in the active tab

Includes cost estimation in USD based on detected model (Claude Opus, Sonnet, Haiku).

### Integrated Markdown Editor

Open a markdown editor alongside the terminal — no need to leave the app. Features:

- Split view with live preview
- File browser with folder navigation
- Create / rename files and folders
- Token count per file (estimates LLM cost to load it)
- Syntax highlighting for code files (25+ languages)
- Auto-save with manual override (⌘S)
- PDF export from markdown
- **Automatic version history** — every save creates a snapshot; browse, compare, and restore any previous version from the editor sidebar (up to 50 versions per file, stored locally)

### 14 Themes

Includes Dracula, Tokyo Night, Nord, Gruvbox, Catppuccin, Rosé Pine, Solarized, and more. Live preview before applying.

### Smart Status Bar

The status bar surfaces live context without interrupting focus:

- **Git status** — current branch and dirty-state indicator updated in real time
- **App version** — running build version detected automatically at startup
- **Component versions** — each integrated component reports its version without any configuration

### Command Palette

⌘K to launch any command: split pane, new workspace, open folder, launch Claude Code / OpenCode / Aider, open settings.

### Quick AI Launchers

⌘⇧C launches Claude Code in the active pane. ⌘⇧O launches OpenCode. No typing required.

---

## What It Replaces

| Before                                          | With terminalOS                                    |
| ----------------------------------------------- | -------------------------------------------------- |
| Downloading and installing a terminal app       | Run instantly with `npx terminalos` in the browser |
| Terminal locked to one machine/OS               | Works in any browser, any OS, zero setup           |
| No token visibility                             | Per-session and per-workspace token count          |
| Markdown notes in separate app                  | Editor integrated next to the terminal             |
| Manually typing `claude` / `aider` to start AI | One shortcut per AI tool                           |
| No context on which pane is running AI          | Live badge per pane                                |
| No edit history for notes / context files       | Automatic version history with restore             |
| No visibility into git state inside the app     | Branch + dirty state in the status bar             |

---

## Platform

Browser-based — works on any OS (macOS, Windows, Linux) without installation.

```bash
npx terminalos
```

terminalOS starts a **local server on your machine** and opens in your default browser automatically. No app to download, no installer to run. Everything runs locally — your terminal sessions, token data, and files never leave your machine.
