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
  IconPanelRight,
  IconPanelBottom,
  IconMarkdownDoc,
} from "../Icons";

interface PaneHeaderProps {
  session: Session;
  isFocused: boolean;
  paneId: string;
  canClose: boolean;
  isMinimized?: boolean;
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
  onSplit,
  onClose,
  onOpenMd,
  onToggleMinimize,
}) => {
  const path = shortPath(session.cwd);

  return (
    <div className={`${styles.paneHeader} ${isFocused ? styles.focused : ""}`}>
      <div className={styles.paneHeaderLeft}>
        {session.condaEnv && (
          <span className={styles.envBadge}>
            <span className={styles.envIcon}>›</span>
            <span className={styles.envName}>{session.condaEnv}</span>
          </span>
        )}
        <span className={styles.sessionPath}>{path}</span>

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
          {isMinimized ? <IconRestore size={10} /> : <IconMinus size={10} />}
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
