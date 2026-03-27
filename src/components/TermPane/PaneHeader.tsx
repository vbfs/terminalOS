import { api } from "../../api";
import React from "react";
import styles from "./TermPane.module.css";
import { useUiStore } from "../../store/ui.store";
import { useWorkspaceStore } from "../../store/workspace.store";
import { useSessionsStore } from "../../store/sessions.store";
import { Tooltip } from "../Tooltip/Tooltip";
function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
import type { Session } from "../../types/session";
import type { SplitDirection } from "../../types/pane";
import {
  IconX,
  IconMinus,
  IconRestore,
  IconArrowLeft,
  IconArrowRight,
  IconPanelRight,
  IconPanelBottom,
  IconMarkdownDoc,
  IconFolder,
} from "../Icons";

interface PaneHeaderProps {
  session: Session;
  isFocused: boolean;
  paneId: string;
  canClose: boolean;
  isMinimized?: boolean;
  restoreDirection?: 'up' | 'left' | 'right';
  onSplit: (paneId: string, dir: SplitDirection) => void;
  onClose: (paneId: string) => void;
  onOpenMd?: (paneId: string) => void;
  onToggleMinimize?: (paneId: string) => void;
}

function shortPath(cwd: string): string {
  if (!cwd) return "~";
  const normalized = cwd.replace(/\\/g, "/");
  const stripped = normalized
    .replace(/^\/Users\/[^/]+/, "~")
    .replace(/^\/home\/[^/]+/, "~")
    .replace(/^[A-Za-z]:\/Users\/[^/]+/, "~");
  const parts = stripped.split("/").filter(Boolean);
  if (parts.length === 0) return normalized;
  return parts.slice(-2).join("/");
}

export const PaneHeader: React.FC<PaneHeaderProps> = ({
  session,
  isFocused,
  paneId,
  canClose,
  isMinimized,
  restoreDirection = 'up',
  onSplit,
  onClose,
  onOpenMd,
  onToggleMinimize,
}) => {
  const path = shortPath(session.cwd);
  const copiedFlash = useUiStore((s) => s.copiedFlash);
  const rootFolder = useWorkspaceStore((s) => s.rootFolder);
  const workspaceName = (rootFolder ?? session.cwd ?? "").replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? null;

  const handleOpenFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = await api.fs.openFolder();
    if (folder) {
      api.pty.write(session.id, `cd "${folder}"\n`);
      useSessionsStore.getState().updateCwd(session.id, folder);
    }
  };

  return (
    <div className={`${styles.paneHeader} ${isFocused ? styles.focused : ""}`}>
      <div className={styles.paneHeaderLeft}>
        {workspaceName && (
          <span className={styles.workspaceBadge}>
            <span className={styles.workspaceName}>{workspaceName}</span>
          </span>
        )}
        <Tooltip content="Open folder dialog" placement="bottom">
          <button className={styles.pathBtn} onClick={handleOpenFolder}>
            <IconFolder size={11} />
            <span>{path}</span>
          </button>
        </Tooltip>

        <>
          <span className={styles.sessionPath}>|</span>
          {isFocused && copiedFlash ? (
            <span className={styles.copiedFlash}>{copiedFlash}</span>
          ) : (
            <>
              <span className={styles.sessionPath}>session tokens:</span>
              <span className={styles.sessionPath}>
                {"~"}
                {formatTokens(session.tokens || 0)}
              </span>
            </>
          )}
        </>
      </div>

      <div
        className={`${styles.paneActions} ${isMinimized ? styles.paneActionsMinimized : ""}`}
      >
        <Tooltip content={isMinimized ? "Restore pane" : "Minimize pane"} placement="bottom">
          <button
            className={`${styles.paneActionBtn} ${styles.minimizeBtn}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize?.(paneId);
            }}
          >
          {isMinimized
            ? restoreDirection === 'left'
              ? <IconArrowLeft size={10} />
              : restoreDirection === 'right'
                ? <IconArrowRight size={10} />
                : <IconRestore size={10} />
            : <IconMinus size={10} />
          }
          </button>
        </Tooltip>
        {!isMinimized && onOpenMd && (
          <Tooltip content="Open Markdown Editor" shortcut="⌘⇧M" placement="bottom">
            <button
              className={`${styles.paneActionBtn} ${styles.mdBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenMd(paneId);
              }}
            >
              <IconMarkdownDoc size={12} />
            </button>
          </Tooltip>
        )}
        {!isMinimized && (
          <Tooltip content="Split right" shortcut="⌘D" placement="bottom">
            <button
              className={styles.paneActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                onSplit(paneId, "h");
              }}
            >
              <IconPanelRight size={12} />
            </button>
          </Tooltip>
        )}
        {!isMinimized && (
          <Tooltip content="Split below" shortcut="⌘⇧D" placement="bottom">
            <button
              className={styles.paneActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                onSplit(paneId, "v");
              }}
            >
              <IconPanelBottom size={12} />
            </button>
          </Tooltip>
        )}
        {!isMinimized && canClose && (
          <Tooltip content="Close pane" shortcut="⌘W" placement="bottom">
            <button
              className={`${styles.paneActionBtn} ${styles.closePaneBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(paneId);
              }}
            >
              <IconX size={10} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
