import { api } from "../../api";
import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./CommandPalette.module.css";
import { useTabsStore } from "../../store/tabs.store";
import { useWorkspaceStore } from "../../store/workspace.store";
import { useSessionsStore } from "../../store/sessions.store";
import { useUiStore } from "../../store/ui.store";
import { track } from "../../lib/amplitude";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  action: () => Promise<void> | void;
}

function fuzzyScore(str: string, query: string): number {
  if (!query) return 1;
  str = str.toLowerCase();
  query = query.toLowerCase();

  if (str === query) return 100;
  if (str.startsWith(query)) return 80;
  if (str.includes(query)) return 60;

  let si = 0;
  let qi = 0;
  let score = 0;
  while (si < str.length && qi < query.length) {
    if (str[si] === query[qi]) {
      score++;
      qi++;
    }
    si++;
  }
  if (qi < query.length) return 0;
  return score * 10;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMd?: (tabId: string, paneId: string) => void;
  onOpenSettings?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenMd,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabsStore = useTabsStore();
  const canClosePane =
    tabsStore.tabs.length > 1 ||
    (tabsStore.tabs.find((t) => t.id === tabsStore.activeTabId)?.paneCount ??
      1) > 1;
  const { rootFolder, recentFolders, setRootFolder } = useWorkspaceStore();
  const { addSession } = useSessionsStore();
  const sessions = useSessionsStore((s) => s.sessions);

  const activeTab = tabsStore.tabs.find((t) => t.id === tabsStore.activeTabId);
  const activePaneSession = activeTab?.activePaneId
    ? Array.from(sessions.values()).find(
        (s) => s.paneId === activeTab.activePaneId,
      )
    : undefined;
  const activeCwd = activePaneSession?.cwd || rootFolder || undefined;

  const commands: Command[] = [
    {
      id: "pane.newBelow",
      label: "New Pane Below",
      shortcut: "⌘↓",
      icon: "⊟",
      action: async () => {
        if (!activeTab?.activePaneId) return;
        const sessionId = await api.pty.create({ cwd: activeCwd });
        const newPaneId = tabsStore.splitTabPane(
          activeTab.id,
          activeTab.activePaneId,
          "v",
          sessionId,
        );
        addSession({
          id: sessionId,
          paneId: newPaneId,
          name: "Session",
          cwd: activeCwd ?? "",
          status: "running",
          aiProcess: null,
          tokens: 0,
          model: null,
          costUsd: 0,
          alertMessage: null,
          condaEnv: null,
          createdAt: Date.now(),
        });
        onClose();
      },
    },
    {
      id: "pane.splitRight",
      label: "Split Pane Right",
      shortcut: "⌘D",
      icon: "⊞",
      action: async () => {
        if (!activeTab?.activePaneId) return;
        const sessionId = await api.pty.create({ cwd: activeCwd });
        const newPaneId = tabsStore.splitTabPane(
          activeTab.id,
          activeTab.activePaneId,
          "h",
          sessionId,
        );
        addSession({
          id: sessionId,
          paneId: newPaneId,
          name: "Session",
          cwd: activeCwd ?? "",
          status: "running",
          aiProcess: null,
          tokens: 0,
          model: null,
          costUsd: 0,
          alertMessage: null,
          condaEnv: null,
          createdAt: Date.now(),
        });
        onClose();
      },
    },
    {
      id: "tab.new",
      label: "New Workspace",
      shortcut: "⌘T",
      icon: "+",
      action: async () => {
        const n = tabsStore.tabs.length + 1;
        const tabId = tabsStore.createTab(`Shell ${n}`);
        const cwd = rootFolder ?? undefined;
        const sessionId = await api.pty.create({ cwd });
        const paneId = tabsStore.initTabRoot(tabId, sessionId);
        addSession({
          id: sessionId,
          paneId,
          name: `Shell ${n}`,
          cwd: cwd ?? "",
          status: "running",
          aiProcess: null,
          tokens: 0,
          model: null,
          costUsd: 0,
          alertMessage: null,
          condaEnv: null,
          createdAt: Date.now(),
        });
        onClose();
      },
    },
    {
      id: "ai.launchClaude",
      label: "Launch Claude Code",
      shortcut: "⌘⇧C",
      icon: "◉",
      action: () => {
        if (!activeTab?.activePaneId) return;
        const session = Array.from(sessions.values()).find(
          (s) => s.paneId === activeTab.activePaneId,
        );
        if (session) api.pty.write(session.id, "claude\n");
        onClose();
      },
    },
    {
      id: "ai.launchOpencode",
      label: "Launch Opencode",
      shortcut: "⌘⇧O",
      icon: "◉",
      action: () => {
        if (!activeTab?.activePaneId) return;
        const session = Array.from(sessions.values()).find(
          (s) => s.paneId === activeTab.activePaneId,
        );
        if (session) api.pty.write(session.id, "opencode\n");
        onClose();
      },
    },
    {
      id: "ai.launchAider",
      label: "Launch Aider",
      icon: "◉",
      action: () => {
        if (!activeTab?.activePaneId) return;
        const session = Array.from(sessions.values()).find(
          (s) => s.paneId === activeTab.activePaneId,
        );
        if (session) api.pty.write(session.id, "aider\n");
        onClose();
      },
    },
    {
      id: "md.openEditor",
      label: "Open Markdown Editor",
      shortcut: "⌘⇧M",
      icon: "◆",
      action: () => {
        if (activeTab?.activePaneId && onOpenMd) {
          onOpenMd(activeTab.id, activeTab.activePaneId);
        }
        onClose();
      },
    },
    {
      id: "workspace.openFolder",
      label: "Open Folder...",
      shortcut: "⌘O",
      icon: "⌁",
      action: async () => {
        const activeSession = activeTab?.activePaneId
          ? Array.from(sessions.values()).find((s) => s.paneId === activeTab.activePaneId)
          : undefined;
        const folder = await api.fs.openFolder(activeSession?.cwd ?? null);
        if (folder && activeTab?.activePaneId) {
          setRootFolder(folder);
          const sessionId = await api.pty.create({ cwd: folder });
          const newPaneId = tabsStore.splitTabPane(
            activeTab.id,
            activeTab.activePaneId,
            "v",
            sessionId,
          );
          addSession({
            id: sessionId,
            paneId: newPaneId,
            name: "Session",
            cwd: folder,
            status: "running",
            aiProcess: null,
            tokens: 0,
            model: null,
            costUsd: 0,
            alertMessage: null,
            condaEnv: null,
            createdAt: Date.now(),
          });
        }
        onClose();
      },
    },
    {
      id: "app.settings",
      label: "Open Settings",
      shortcut: "⌘,",
      icon: "⚙",
      action: () => {
        onOpenSettings?.();
      },
    },
    {
      id: "app.shortcuts",
      label: "Keyboard Shortcuts",
      shortcut: "?",
      icon: "⌨",
      action: () => {
        useUiStore.getState().setShortcutRefOpen(true);
        onClose();
      },
    },
    ...(canClosePane
      ? [
          {
            id: "pane.closeActive",
            label: "Close Active Pane",
            shortcut: "⌘W",
            icon: "✕",
            action: () => {
              if (activeTab?.activePaneId)
                tabsStore.closeTabPane(activeTab.id, activeTab.activePaneId);
              onClose();
            },
          },
        ]
      : []),
    ...recentFolders.slice(0, 5).map((folder) => ({
      id: `recent:${folder}`,
      label: `Open ${folder.split("/").pop()}`,
      icon: "↺",
      action: async () => {
        if (!activeTab?.activePaneId) return;
        setRootFolder(folder);
        const sessionId = await api.pty.create({ cwd: folder });
        const newPaneId = tabsStore.splitTabPane(
          activeTab.id,
          activeTab.activePaneId,
          "v",
          sessionId,
        );
        addSession({
          id: sessionId,
          paneId: newPaneId,
          name: "Session",
          cwd: folder,
          status: "running",
          aiProcess: null,
          tokens: 0,
          model: null,
          costUsd: 0,
          alertMessage: null,
          condaEnv: null,
          createdAt: Date.now(),
        });
        onClose();
      },
    })),
  ];

  const filtered = commands
    .map((cmd) => ({ cmd, score: fuzzyScore(cmd.label, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      track('command_palette_opened');
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIdx];
        if (cmd) { track('command_executed', { command: cmd.id, label: cmd.label, trigger: 'keyboard' }); cmd.action(); }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIdx, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.results}>
          {filtered.map((cmd, idx) => (
            <div
              key={cmd.id}
              className={`${styles.result} ${idx === selectedIdx ? styles.selected : ""}`}
              onClick={() => { track('command_executed', { command: cmd.id, label: cmd.label, trigger: 'click' }); cmd.action(); }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <span className={styles.resultIcon}>{cmd.icon ?? "›"}</span>
              <span className={styles.resultLabel}>{cmd.label}</span>
              {cmd.shortcut && (
                <span className={styles.resultShortcut}>{cmd.shortcut}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={styles.noResults}>No commands found</div>
          )}
        </div>
        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <span className={styles.footerKey}>↑↓</span> navigate
          </span>
          <span className={styles.footerHint}>
            <span className={styles.footerKey}>↵</span> select
          </span>
          <span className={styles.footerHint}>
            <span className={styles.footerKey}>esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
};
