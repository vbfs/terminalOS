import React, { useRef, useState, useCallback } from "react";
import styles from "./TermPane.module.css";
import { PaneHeader } from "./PaneHeader";
import { usePty } from "../../hooks/usePty";
import { useSessionsStore } from "../../store/sessions.store";
import { useTabsStore } from "../../store/tabs.store";
import { ContextMenu, isMac } from "../ContextMenu/ContextMenu";
import type { SplitDirection } from "../../types/pane";

const mod = isMac ? "⌘" : "Ctrl+";
const sh = isMac ? "⇧" : "Shift+";
const ctrl = isMac ? "⌃" : "Ctrl+";

interface TermPaneProps {
  sessionId: string;
  paneId: string;
  isActive: boolean;
  canClose: boolean;
  restoreDirection?: 'up' | 'left' | 'right';
  onSplit: (paneId: string, dir: SplitDirection) => void;
  onClose: (paneId: string) => void;
  onFocus: (paneId: string) => void;
  onOpenMd?: (paneId: string) => void;
  onCommandPalette?: () => void;
  onNewTab?: () => void;
}

export const TermPane: React.FC<TermPaneProps> = React.memo(
  ({
    sessionId,
    paneId,
    isActive,
    canClose,
    restoreDirection,
    onSplit,
    onClose,
    onFocus,
    onOpenMd,
    onCommandPalette,
    onNewTab,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const session = useSessionsStore((s) => s.sessions.get(sessionId));
    const setAlert = useSessionsStore((s) => s.setAlert);
    const isMinimized = useTabsStore((s) => s.minimizedPanes.has(paneId));
    const toggleMinimize = useTabsStore((s) => s.toggleMinimizePane);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(
      null,
    );
    const [hasInteracted, setHasInteracted] = useState(false);

    usePty({ sessionId, containerRef });

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ x: e.clientX, y: e.clientY });
    }, []);

    if (!session) return null;

    const hasSelection = !!window.getSelection()?.toString();

    const ctxGroups = [
      // ── Clipboard ──────────────────────────────────
      {
        items: [
          {
            icon: "⊡",
            label: "Copy",
            shortcut: `${mod}C`,
            disabled: !hasSelection,
            onClick: () => {
              const sel = window.getSelection()?.toString();
              if (sel) navigator.clipboard.writeText(sel);
            },
          },
          {
            icon: "⊞",
            label: "Paste",
            shortcut: `${mod}V`,
            onClick: async () => {
              const text = await navigator.clipboard.readText();
              if (text) window.api.pty.write(sessionId, text);
            },
          },
          {
            icon: "⌫",
            label: "Clear",
            shortcut: `${ctrl}L`,
            onClick: () => window.api.pty.write(sessionId, "\x0c"),
          },
        ],
      },
      // ── Pane management ────────────────────────────
      {
        items: [
          {
            icon: "⊞",
            label: "Split Right",
            shortcut: `${mod}D`,
            onClick: () => onSplit(paneId, "h"),
          },
          {
            icon: "⊟",
            label: "Split Below",
            shortcut: `${mod}${sh}D`,
            onClick: () => onSplit(paneId, "v"),
          },
          {
            icon: isMinimized ? "⊟" : "–",
            label: isMinimized ? "Restore Pane" : "Minimize Pane",
            onClick: () => toggleMinimize(paneId),
          },
          ...(canClose
            ? [
                {
                  icon: "✕",
                  label: "Close Pane",
                  shortcut: `${mod}W`,
                  danger: true,
                  onClick: () => onClose(paneId),
                },
              ]
            : []),
        ],
      },
      // ── App ────────────────────────────────────────
      {
        items: [
          {
            icon: "◆",
            label: "Open Markdown Editor",
            shortcut: `${mod}${sh}M`,
            onClick: () => onOpenMd?.(paneId),
          },
          {
            icon: "⌘",
            label: "Command Palette",
            shortcut: `${mod}K`,
            onClick: () => onCommandPalette?.(),
          },
          {
            icon: "+",
            label: "New Workspace",
            shortcut: `${mod}T`,
            onClick: () => onNewTab?.(),
          },
        ],
      },
    ];

    return (
      <div
        className={`${styles.termPane} ${isActive ? styles.focused : ""} ${isMinimized ? styles.minimized : ""}`}
        onMouseDown={() => onFocus(paneId)}
        onContextMenu={handleContextMenu}
      >
        <PaneHeader
          session={session}
          isFocused={isActive}
          paneId={paneId}
          canClose={canClose}
          isMinimized={isMinimized}
          restoreDirection={restoreDirection}
          onSplit={onSplit}
          onClose={onClose}
          onOpenMd={onOpenMd}
          onToggleMinimize={toggleMinimize}
        />

        {!isMinimized && session.alertMessage && (
          <div className={styles.inlineAlert}>
            <span>{session.alertMessage}</span>
            <button className={styles.alertDismiss} onClick={() => setAlert(sessionId, null)}>×</button>
          </div>
        )}

        <div
          ref={containerRef}
          className={styles.terminal}
          onMouseDown={() => setHasInteracted(true)}
        >
          {!hasInteracted && (
            <div className={`${styles.placeholder} ${isActive ? styles.placeholderActive : ""}`}>
              Select a folder from the header, or press{" "}
              <kbd className={styles.kbd}>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
              {" "}to open the Command Palette
              <span className={styles.cursor}>▌</span>
            </div>
          )}
        </div>

        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            groups={ctxGroups}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </div>
    );
  },
);

TermPane.displayName = "TermPane";
