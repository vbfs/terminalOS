import React, { useMemo, useState } from "react";
import styles from "./StatusBar.module.css";
import { useSessionsStore } from "../../store/sessions.store";
import { useTabsStore } from "../../store/tabs.store";
import { useUiStore } from "../../store/ui.store";

function formatTokens(n: number): string {
  if (n >= 1000) return `~${(n / 1000).toFixed(1)}k`;
  return `~${n}`;
}

function shortenCwd(cwd: string): string {
  if (!cwd) return "";
  const stripped = cwd.replace(/^\/(Users|home)\/[^/]+\//, "");
  const parts = stripped.split("/").filter(Boolean);
  if (parts.length === 0) return cwd;
  return parts.slice(-2).join("/");
}

export const StatusBar: React.FC = () => {
  const [isMac] = useState(() =>
    navigator.platform.toLowerCase().includes("mac"),
  );

  const focusedSessionId = useSessionsStore((s) => s.focusedSessionId);
  const sessionsMap = useSessionsStore((s) => s.sessions);
  const copiedFlash = useUiStore((s) => s.copiedFlash);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const tabs = useTabsStore((s) => s.tabs);
  const getTabPaneIds = useTabsStore((s) => s.getTabPaneIds);

  // All pane IDs in the active workspace
  const activePaneIds = useMemo(
    () => (activeTabId ? getTabPaneIds(activeTabId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTabId, tabs],
  );

  // All sessions belonging to the active workspace
  const sessions = useMemo(
    () =>
      Array.from(sessionsMap.values()).filter((s) =>
        activePaneIds.includes(s.paneId),
      ),
    [sessionsMap, activePaneIds],
  );

  // Focused (active pane) session
  const focusedSession = useMemo(
    () =>
      (focusedSessionId ? sessionsMap.get(focusedSessionId) : null) ??
      sessions[0] ??
      null,
    [focusedSessionId, sessionsMap, sessions],
  );

  // Session tokens = focused terminal only
  const sessionTokens = focusedSession?.tokens ?? 0;

  // Workspace tokens = sum of all terminals in the workspace
  const workspaceTokens = sessions.reduce((sum, s) => sum + s.tokens, 0);

  const condaEnv = focusedSession?.condaEnv ?? null;
  const cwd = focusedSession?.cwd ?? "";
  const shortCwd = shortenCwd(cwd);

  return (
    <div className={styles.statusBar}>
      {/* ── Left: env + path + session tokens ── */}
      <div className={styles.left}>
        {/* {condaEnv && (
          <span className={styles.envTag}>
            <span className={styles.envArrow}>&gt;</span>
            <span className={styles.envName}>{condaEnv}</span>
          </span>
        )}

        {shortCwd && (
          <span className={styles.cwd} title={cwd}>
            {shortCwd}
          </span>
        )} */}

        <>
          <span className={styles.label}>workspace tokens: </span>
          <span className={styles.value}>
            {" "}
            {formatTokens(workspaceTokens || 0)}
          </span>
        </>

        {copiedFlash && (
          <span className={styles.copiedFlash}>{copiedFlash}</span>
        )}
      </div>

      {/* ── Right: workspace tokens + window controls ── */}
      <div className={styles.right}>
        {/* {workspaceTokens > 0 && (
          <span className={styles.workspaceTokens}>
            <span className={styles.label}>workspace tokens:</span>
            <span className={styles.value}>
              {" "}
              {formatTokens(workspaceTokens)}
            </span>
          </span>
        )} */}

        {!isMac && (
          <div className={styles.windowControls}>
            <button
              onClick={() => window.api.window.minimize()}
              className={styles.winBtn}
              title="Minimize"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <rect x="0" y="4.5" width="10" height="1" />
              </svg>
            </button>
            <button
              onClick={() => window.api.window.maximize()}
              className={styles.winBtn}
              title="Maximize"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="0.5" y="0.5" width="9" height="9" />
              </svg>
            </button>
            <button
              onClick={() => window.api.window.close()}
              className={`${styles.winBtn} ${styles.closeBtn}`}
              title="Close"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <path
                  d="M1 1l8 8M9 1L1 9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
