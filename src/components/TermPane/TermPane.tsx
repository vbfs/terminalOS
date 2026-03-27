import { api } from "../../api";
import React, { useRef, useState, useCallback, useEffect } from "react";
import styles from "./TermPane.module.css";
import { PaneHeader } from "./PaneHeader";
import { usePty } from "../../hooks/usePty";
import { useSessionsStore } from "../../store/sessions.store";
import { useTabsStore } from "../../store/tabs.store";
import { useWorkspaceStore } from "../../store/workspace.store";
import { ContextMenu, isMac } from "../ContextMenu/ContextMenu";
import type { SplitDirection } from "../../types/pane";

const mod = isMac ? "⌘" : "Ctrl+";
const sh = isMac ? "⇧" : "Shift+";
const ctrl = isMac ? "⌃" : "Ctrl+";

// Persists across remounts — once a session has been interacted with,
// never show the placeholder again regardless of component lifecycle.
const interactedSessions = new Set<string>();

interface TermPaneProps {
  sessionId: string;
  paneId: string;
  isActive: boolean;
  canClose: boolean;
  restoreDirection?: "up" | "left" | "right";
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
    const minimizedPanes = useTabsStore((s) => s.minimizedPanes);
    const toggleMinimize = useTabsStore((s) => s.toggleMinimizePane);
    const rootFolder = useWorkspaceStore((s) => s.rootFolder);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(
      null,
    );
    const [hasInteracted, setHasInteracted] = useState(() =>
      interactedSessions.has(sessionId),
    );

    const { paste, fit, isInitializing } = usePty({ sessionId, containerRef });

    useEffect(() => {
      if (isMinimized) return;
      const timer = setTimeout(() => fit(), 250);
      return () => clearTimeout(timer);
    }, [minimizedPanes, isMinimized]);

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
              if (text) paste(text);
            },
          },
          {
            icon: "⌫",
            label: "Clear",
            shortcut: `${ctrl}L`,
            onClick: () => api.pty.write(sessionId, "\x0c"),
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
            <button
              className={styles.alertDismiss}
              onClick={() => setAlert(sessionId, null)}
            >
              ×
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className={styles.terminal}
          onMouseDown={() => {
            interactedSessions.add(sessionId);
            setHasInteracted(true);
          }}
          onKeyDown={() => {
            interactedSessions.add(sessionId);
            setHasInteracted(true);
          }}
        >
          {isInitializing && (
            <div className={styles.initializing}>
              <span>Initializing terminal</span>
              <span className={styles.initDots}></span>
            </div>
          )}
          {!hasInteracted && !isInitializing && (
            <div className={styles.placeholder}>
              {rootFolder ? (
                <>
                  <div className={styles.placeholderIcon}>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </div>
                  <div className={styles.placeholderTitle}>Terminal ready</div>
                  <div className={styles.placeholderHint}>
                    Type a command or {isMac ? "⌘⇧M" : "Ctrl+Shift+M"} to open
                    the Markdown editor
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.placeholderIcon}>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className={styles.placeholderTitle}>
                    Your AI terminal is ready.
                  </div>
                  <div className={styles.placeholderHint}>
                    Open a folder and start building.
                  </div>
                  <div className={styles.placeholderHint}>
                    Press {isMac ? "⌘O" : "Ctrl+O"} to open a folder
                  </div>
                  <button
                    className={styles.placeholderBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCommandPalette?.();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {isMac ? "⌘K" : "Ctrl+K"} Open Command Palette
                  </button>
                </>
              )}
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
