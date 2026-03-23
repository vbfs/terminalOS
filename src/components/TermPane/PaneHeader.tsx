import React from "react";
import styles from "./TermPane.module.css";
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
  const parts = cwd.replace(/^\/Users\/[^/]+/, "~").split("/");
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

  const handleOpenFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = await window.api.fs.openFolder();
    if (folder) {
      window.api.pty.write(session.id, `cd "${folder}"\n`);
    }
  };

  return (
    <div className={`${styles.paneHeader} ${isFocused ? styles.focused : ""}`}>
      <div className={styles.paneHeaderLeft}>
        {session.condaEnv && (
          <span className={styles.envBadge}>
            <span className={styles.envIcon}>›</span>
            <span className={styles.envName}>{session.condaEnv}</span>
          </span>
        )}
        <button className={styles.pathBtn} onClick={handleOpenFolder} title="Open folder">
          <IconFolder size={11} />
          <span>{path}</span>
        </button>

        <>
          <span className={styles.sessionPath}>|</span>
          <span className={styles.sessionPath}>session tokens:</span>
          <span className={styles.sessionPath}>
            {"~"}
            {formatTokens(session.tokens || 0)}
          </span>
        </>
      </div>

      <div
        className={`${styles.paneActions} ${isMinimized ? styles.paneActionsMinimized : ""}`}
      >
        <button
          className={`${styles.paneActionBtn} ${styles.minimizeBtn}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize?.(paneId);
          }}
          title={isMinimized ? "Restore pane" : "Minimize pane"}
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
        {!isMinimized && onOpenMd && (
          <button
            className={`${styles.paneActionBtn} ${styles.mdBtn}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMd(paneId);
            }}
            title="Open Markdown Editor"
          >
            <IconMarkdownDoc size={12} />
          </button>
        )}
        {!isMinimized && (
          <button
            className={styles.paneActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onSplit(paneId, "h");
            }}
            title="Split right (Cmd+D)"
          >
            <IconPanelRight size={12} />
          </button>
        )}
        {!isMinimized && (
          <button
            className={styles.paneActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onSplit(paneId, "v");
            }}
            title="Split down (Cmd+Shift+D)"
          >
            <IconPanelBottom size={12} />
          </button>
        )}
        {!isMinimized && canClose && (
          <button
            className={`${styles.paneActionBtn} ${styles.closePaneBtn}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose(paneId);
            }}
            title="Close pane (Cmd+W)"
          >
            <IconX size={10} />
          </button>
        )}
      </div>
    </div>
  );
};
