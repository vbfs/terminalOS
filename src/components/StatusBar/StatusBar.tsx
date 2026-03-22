import React, { useMemo } from "react";
import styles from "./StatusBar.module.css";
import { useSessionsStore } from "../../store/sessions.store";
import { useTabsStore } from "../../store/tabs.store";
import { useUiStore } from "../../store/ui.store";
import { getAgentType } from "../../types/session";
import type { Session } from "../../types/session";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export const StatusBar: React.FC = () => {
  const sessionOrder = useSessionsStore((s) => s.sessionOrder);
  const sessionsMap = useSessionsStore((s) => s.sessions);
  const copiedFlash = useUiStore((s) => s.copiedFlash);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const tabs = useTabsStore((s) => s.tabs);
  const getTabPaneIds = useTabsStore((s) => s.getTabPaneIds);

  const allSessions = useMemo(
    () =>
      sessionOrder
        .map((id) => sessionsMap.get(id))
        .filter((s): s is Session => s !== undefined),
    [sessionOrder, sessionsMap],
  );

  // Sessions belonging to the active workspace (tab) only
  const activePaneIds = useMemo(
    () => (activeTabId ? getTabPaneIds(activeTabId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTabId, tabs],
  );

  const sessions = useMemo(
    () => allSessions.filter((s) => activePaneIds.includes(s.paneId)),
    [allSessions, activePaneIds],
  );

  const running = sessions.filter((s) => s.status === "running");
  const totalTokens = sessions.reduce((sum, s) => sum + s.tokens, 0);

  const agentTypes = [...new Set(sessions.map((s) => getAgentType(s)))];
  const modelLabels = agentTypes.map((t) => {
    if (t === "CLAUDE") return "claude";
    if (t === "OC") return "opencode";
    return "shell";
  });

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.runningDot} />
        <span className={styles.item}>{running.length} running</span>

        {totalTokens > 0 && (
          <>
            <span className={styles.sep}>|</span>
            <span className={styles.muted}>tokens</span>
            <span className={styles.item}>{formatTokens(totalTokens)}</span>
          </>
        )}

        {modelLabels.length > 0 && (
          <>
            <span className={styles.sep}>|</span>
            <span className={styles.muted}>model</span>
            <span className={styles.item}>{modelLabels.join(" · ")}</span>
          </>
        )}
      </div>

      <div className={styles.right}>
        {copiedFlash && (
          <span className={styles.copiedFlash}>{copiedFlash}</span>
        )}
        <span className={styles.version}>v0.1.0</span>
      </div>
    </div>
  );
};
