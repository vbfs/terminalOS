import React, { useState, useRef } from "react";
import styles from "./TabBar.module.css";
import { useTabsStore } from "../../store/tabs.store";
import { useSessionsStore } from "../../store/sessions.store";
import { getDotState } from "../../types/session";
import { getAllLeaves } from "../../types/pane";
import type { AgentType, DotState } from "../../types/session";
import { IconX, IconPlus } from "../Icons";
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog";
import { Tooltip } from "../Tooltip/Tooltip";

const AGENT_LABELS: Record<AgentType, string> = {
  CLAUDE: "CLAUDE",
  OC: "OC",
  SHELL: "SHELL",
};

export const AgentBadge: React.FC<{ type: AgentType; small?: boolean }> = ({
  type,
  small,
}) => (
  <span
    className={`${styles.agentBadge} ${styles[`badge${type}`]} ${small ? styles.badgeSmall : ""}`}
  >
    {AGENT_LABELS[type]}
  </span>
);

export const StatusDot: React.FC<{ state: DotState }> = ({ state }) => (
  <span className={`${styles.statusDot} ${styles[`dot${state}`]}`} />
);

interface TabBarProps {
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ onNewTab, onCloseTab }) => {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const renameTab = useTabsStore((s) => s.renameTab);
  const sessionsMap = useSessionsStore((s) => s.sessions);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

  const getTabDotState = (tabId: string): DotState => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab?.root) return "idle";
    const leaves = getAllLeaves(tab.root);
    for (const leaf of leaves) {
      // Find session by paneId matching leaf.id
      for (const session of sessionsMap.values()) {
        if (session.paneId === leaf.id) {
          const ds = getDotState(session);
          if (ds === "waiting") return "waiting";
          if (ds === "running") return "running";
        }
      }
    }
    return "idle";
  };

  const getPaneCount = (tabId: string): number => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab?.root) return 0;
    return getAllLeaves(tab.root).length;
  };

  const startRename = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditValue(currentName);
    setTimeout(() => editRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (editingTabId && editValue.trim()) {
      renameTab(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const dotState = getTabDotState(tab.id);
          const paneCount = getPaneCount(tab.id);

          return (
            <div
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => startRename(tab.id, tab.name)}
              title={tab.name}
            >
              <StatusDot state={dotState} />
              {paneCount > 0 && (
                <span className={styles.paneCountBadge}>{paneCount}</span>
              )}
              {editingTabId === tab.id ? (
                <input
                  ref={editRef}
                  className={styles.tabNameInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingTabId(null);
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className={styles.tabName}
                  onClick={(e) => {
                    if (isActive) {
                      e.stopPropagation();
                      startRename(tab.id, tab.name);
                    }
                  }}
                  title={isActive ? "Click to rename" : tab.name}
                >
                  {tab.name}
                </span>
              )}
              {tabs.length > 1 && (
                <Tooltip content="Close workspace" placement="bottom">
                  <button
                    className={styles.closeTabBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (paneCount > 1) {
                        setClosingTabId(tab.id);
                      } else {
                        onCloseTab(tab.id);
                      }
                    }}
                  >
                    <IconX size={9} />
                  </button>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>

      <Tooltip content="New Workspace" shortcut="⌘T" placement="bottom">
        <button
          className={styles.newTabBtn}
          onClick={onNewTab}
        >
          <IconPlus size={11} />
        </button>
      </Tooltip>

      {closingTabId && (() => {
        const closingTab = tabs.find((t) => t.id === closingTabId);
        return (
          <ConfirmDialog
            isOpen
            title={`Close "${closingTab?.name}"?`}
            body={`This workspace has ${getPaneCount(closingTabId)} open panes. All terminal sessions will be closed.`}
            confirmLabel="Close workspace"
            isDanger
            onConfirm={() => { onCloseTab(closingTabId); setClosingTabId(null) }}
            onCancel={() => setClosingTabId(null)}
          />
        );
      })()}
    </div>
  );
};

// Re-export for backwards compat (SessionTabBar was the old name)
export { TabBar as SessionTabBar };
