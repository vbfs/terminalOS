import React, { useEffect, useMemo, useState } from "react";
import styles from "./StatusBar.module.css";
import { useSessionsStore } from "../../store/sessions.store";
import { useTabsStore } from "../../store/tabs.store";

// Build a direct binary download URL for the given version
function buildDownloadUrl(version: string, isMac: boolean): string {
  const base = `https://github.com/vbfs/terminalOS/releases/download/v${version}`;
  if (!isMac) return `${base}/terminalOS.Setup.${version}.exe`;
  const isArm = typeof process !== "undefined" && process.arch === "arm64";
  return isArm
    ? `${base}/terminalOS-${version}-arm64.dmg`
    : `${base}/terminalOS-${version}.dmg`;
}

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

  // Workspace tokens = sum of all terminals in the workspace
  const workspaceTokens = sessions.reduce((sum, s) => sum + s.tokens, 0);

  const condaEnv = focusedSession?.condaEnv ?? null;
  const cwd = focusedSession?.cwd ?? "";
  const shortCwd = shortenCwd(cwd);

  const [gitBranch, setGitBranch] = useState<string | null>(null);
  useEffect(() => {
    if (!cwd) { setGitBranch(null); return; }
    window.api.app.getGitBranch(cwd).then((branch) => setGitBranch(branch ?? null));
  }, [cwd]);

  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
  useEffect(() => {
    window.api.app.checkForUpdates().then((info) => setUpdateInfo(info ?? null));
  }, []);

  return (
    <div className={styles.statusBar}>
      {/* ── Left: tokens + git branch + cwd ── */}
      <div className={styles.left}>
        <>
          <span className={styles.label}>workspace tokens: </span>
          <span className={styles.value}>
            {" "}
            {formatTokens(workspaceTokens || 0)}
          </span>
        </>

        {gitBranch && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.gitBranch} title={`Branch: ${gitBranch}`}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
                aria-hidden="true"
              >
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              {gitBranch}
            </span>
          </>
        )}

        {condaEnv && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.envTag}>
              <span className={styles.envArrow}>&gt;</span>
              <span className={styles.envName}>{condaEnv}</span>
            </span>
          </>
        )}

        {shortCwd && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.cwd} title={cwd}>
              {shortCwd}
            </span>
          </>
        )}
      </div>

      {/* ── Right: update banner + version + window controls ── */}
      <div className={styles.right}>
        {updateInfo && (
          <div className={styles.updateInline}>
            <span className={styles.updateNewVersion}>v{updateInfo.version}</span>
            <span className={styles.updateLabel}>available</span>
            <button
              className={styles.updateDownloadBtn}
              onClick={() =>
                window.api.shell.openExternal(
                  buildDownloadUrl(updateInfo.version, isMac),
                )
              }
            >
              Download Now!
            </button>
            <button
              className={styles.updateDismiss}
              onClick={() => setUpdateInfo(null)}
              title="Fechar"
            >
              ✕
            </button>
            <span className={styles.updateSep}>·</span>
          </div>
        )}
        <span className={styles.appVersion}>v{__APP_VERSION__}</span>
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
