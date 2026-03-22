import React, { useEffect, useRef, useState } from "react";
import { Titlebar } from "./components/Titlebar/Titlebar";
import { TabBar } from "./components/TabBar/TabBar";
import { PaneGrid } from "./components/PaneGrid/PaneGrid";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { useSessionsStore } from "./store/sessions.store";
import { useTabsStore } from "./store/tabs.store";
import { useWorkspaceStore } from "./store/workspace.store";
import { useKeymap } from "./hooks/useKeymap";
import { getAllLeaves } from "./types/pane";
import styles from "./App.module.css";
import type { SplitDirection } from "./types/pane";

export const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const initDoneRef = useRef(false);
  const addSession = useSessionsStore((s) => s.addSession);
  const {
    createTab,
    closeTab,
    initTabRoot,
    splitTabPane,
    splitMdPane,
    closeTabPane,
  } = useTabsStore();
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const tabs = useTabsStore((s) => s.tabs);
  const { rootFolder } = useWorkspaceStore();

  const handleNewTab = async () => {
    const n = useTabsStore.getState().tabs.length + 1;
    const tabId = createTab(`Workspace ${n}`);
    const cwd = rootFolder ?? undefined;
    const sessionId = await window.api.pty.create({ cwd });
    const paneId = initTabRoot(tabId, sessionId);
    addSession({
      id: sessionId,
      paneId,
      name: "shell",
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
  };

  const handleSplit = async (
    tabId: string,
    paneId: string,
    dir: SplitDirection,
  ) => {
    const activeSession = Array.from(
      useSessionsStore.getState().sessions.values(),
    ).find((s) => s.paneId === paneId);
    const cwd = activeSession?.cwd || rootFolder || undefined;
    const sessionId = await window.api.pty.create({ cwd });
    const newPaneId = splitTabPane(tabId, paneId, dir, sessionId);
    if (!newPaneId) {
      window.api.pty.kill?.(sessionId);
      return;
    }
    addSession({
      id: sessionId,
      paneId: newPaneId,
      name: "shell",
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
  };

  const handleOpenMdPane = (tabId: string, paneId: string) => {
    const sessions = useSessionsStore.getState().sessions;
    const session = Array.from(sessions.values()).find(
      (s) => s.paneId === paneId,
    );
    const cwd = session?.cwd || rootFolder || "";
    splitMdPane(tabId, paneId, "h", cwd);
  };

  const handleClosePane = (tabId: string, paneId: string) => {
    const sessions = useSessionsStore.getState().sessions;
    for (const session of sessions.values()) {
      if (session.paneId === paneId) {
        window.api.pty.kill?.(session.id);
        break;
      }
    }
    closeTabPane(tabId, paneId);
  };

  const handleCloseTab = (tabId: string) => {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
    if (tab?.root) {
      const leaves = getAllLeaves(tab.root);
      const sessions = useSessionsStore.getState().sessions;
      for (const leaf of leaves) {
        for (const session of sessions.values()) {
          if (session.paneId === leaf.id) {
            window.api.pty.kill?.(session.id);
          }
        }
      }
    }
    closeTab(tabId);
  };

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    const init = async () => {
      const tabId = createTab("Workspace 1");
      const cwd = rootFolder ?? undefined;
      const sessionId = await window.api.pty.create({ cwd });
      const paneId = initTabRoot(tabId, sessionId);
      addSession({
        id: sessionId,
        paneId,
        name: "shell",
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
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useKeymap({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onNewTab: handleNewTab,
  });

  return (
    <div className={styles.app}>
      <Titlebar />
      <TabBar onNewTab={handleNewTab} onCloseTab={handleCloseTab} />
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              visibility: tab.id === activeTabId ? "visible" : "hidden",
              pointerEvents: tab.id === activeTabId ? "auto" : "none",
            }}
          >
            <PaneGrid
              tabId={tab.id}
              onSplit={handleSplit}
              onClose={handleClosePane}
              onOpenMd={handleOpenMdPane}
            />
          </div>
        ))}
      </div>
      <StatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenMd={handleOpenMdPane}
      />
    </div>
  );
};
