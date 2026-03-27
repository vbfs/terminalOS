import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { FolderPicker } from "./components/FolderPicker/FolderPicker";
import { Titlebar } from "./components/Titlebar/Titlebar";
import { TabBar } from "./components/TabBar/TabBar";
import { PaneGrid } from "./components/PaneGrid/PaneGrid";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { Settings } from "./components/Settings/Settings";
import { ShortcutReference } from "./components/ShortcutReference/ShortcutReference";
import { useSessionsStore } from "./store/sessions.store";
import { useTabsStore } from "./store/tabs.store";
import { useWorkspaceStore } from "./store/workspace.store";
import { useLayoutStore, type SavedNode } from "./store/layout.store";
import { usePreferencesStore } from "./store/preferences.store";
import type { SavedTab } from "./store/layout.store";
import { useKeymap } from "./hooks/useKeymap";
import { getAllLeaves } from "./types/pane";
import { getThemeById } from "./themes";
import type { PaneNode } from "./types/pane";
import styles from "./App.module.css";
import type { SplitDirection } from "./types/pane";
import type { Session } from "./types/session";
import { track } from "./lib/amplitude";
import { disposeTerminal } from "./lib/terminal-registry";

function serializePaneNode(node: PaneNode, sessions: Map<string, Session>): SavedNode {
  if (node.type === 'leaf') {
    const session = Array.from(sessions.values()).find((s) => s.paneId === node.id)
    return { type: 'leaf', id: node.id, cwd: session?.cwd ?? '' }
  }
  if (node.type === 'md') {
    return { type: 'md', id: node.id, cwd: node.cwd }
  }
  return {
    type: 'split',
    id: node.id,
    direction: node.direction,
    ratio: node.ratio,
    a: serializePaneNode(node.a, sessions),
    b: serializePaneNode(node.b, sessions),
  }
}

async function restorePaneTree(
  saved: SavedNode
): Promise<{ node: PaneNode; sessions: Session[] }> {
  if (saved.type === 'leaf') {
    const sessionId = await api.pty.create({ cwd: saved.cwd || undefined })
    const session: Session = {
      id: sessionId,
      paneId: saved.id,
      name: 'shell',
      cwd: saved.cwd,
      status: 'running',
      aiProcess: null,
      tokens: 0,
      model: null,
      costUsd: 0,
      alertMessage: null,
      condaEnv: null,
      createdAt: Date.now(),
    }
    return { node: { type: 'leaf', id: saved.id, sessionId }, sessions: [session] }
  }
  if (saved.type === 'md') {
    return { node: { type: 'md', id: saved.id, cwd: saved.cwd }, sessions: [] }
  }
  const { node: aNode, sessions: aSessions } = await restorePaneTree(saved.a)
  const { node: bNode, sessions: bSessions } = await restorePaneTree(saved.b)
  return {
    node: {
      type: 'split',
      id: saved.id,
      direction: saved.direction,
      ratio: saved.ratio,
      a: aNode,
      b: bNode,
    },
    sessions: [...aSessions, ...bSessions],
  }
}

export const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const initDoneRef = useRef(false);
  const themeId = usePreferencesStore((s) => s.themeId);

  // Apply CSS vars whenever theme changes
  useEffect(() => {
    const theme = getThemeById(themeId);
    Object.entries(theme.vars).forEach(([key, val]) =>
      document.documentElement.style.setProperty(key, val)
    );
  }, [themeId]);
  const addSession = useSessionsStore((s) => s.addSession);
  const replaceSession = useSessionsStore((s) => s.replaceSession);
  const sessions = useSessionsStore((s) => s.sessions);
  const {
    createTab,
    closeTab,
    initTabRoot,
    splitTabPane,
    splitMdPane,
    closeTabPane,
    restoreTabRoot,
    updateLeafSessionId,
  } = useTabsStore();
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const tabs = useTabsStore((s) => s.tabs);
  const { rootFolder } = useWorkspaceStore();
  const { saveLayout } = useLayoutStore();

  const handleNewTab = async () => {
    const n = useTabsStore.getState().tabs.length + 1;
    const tabId = createTab(`Workspace ${n}`);
    const cwd = rootFolder ?? undefined;
    const sessionId = await api.pty.create({ cwd });
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
    track('tab_created', { workspace_number: n });
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
    const sessionId = await api.pty.create({ cwd });
    const newPaneId = splitTabPane(tabId, paneId, dir, sessionId);
    if (!newPaneId) {
      api.pty.kill?.(sessionId);
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
    track('pane_split', { direction: dir });
  };

  const handleOpenMdPane = (tabId: string, paneId: string) => {
    const sessions = useSessionsStore.getState().sessions;
    const session = Array.from(sessions.values()).find(
      (s) => s.paneId === paneId,
    );
    const cwd = session?.cwd || rootFolder || "";
    splitMdPane(tabId, paneId, "h", cwd);
    track('markdown_editor_opened');
  };

  const handleClosePane = (tabId: string, paneId: string) => {
    const sessions = useSessionsStore.getState().sessions;
    for (const session of sessions.values()) {
      if (session.paneId === paneId) {
        api.pty.kill?.(session.id);
        break;
      }
    }
    closeTabPane(tabId, paneId);
    track('pane_closed');
  };

  const handleCloseTab = (tabId: string) => {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
    if (tab?.root) {
      const leaves = getAllLeaves(tab.root);
      const sessions = useSessionsStore.getState().sessions;
      for (const leaf of leaves) {
        for (const session of sessions.values()) {
          if (session.paneId === leaf.id) {
            api.pty.kill?.(session.id);
          }
        }
      }
    }
    closeTab(tabId);
    track('tab_closed');
  };

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    const createFreshSession = async (tabId: string, cwd?: string) => {
      const sessionId = await api.pty.create({ cwd });
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

    track('app_loaded');

    const init = async () => {
      const { tabs: savedTabs, activeTabIndex } = useLayoutStore.getState();
      if (savedTabs.length > 0) {
        const newTabIds: string[] = [];
        for (const savedTab of savedTabs) {
          const tabId = createTab(savedTab.name);
          newTabIds.push(tabId);
          if (savedTab.root) {
            try {
              const { node: restoredRoot, sessions: restoredSessions } =
                await restorePaneTree(savedTab.root);
              restoreTabRoot(tabId, restoredRoot, savedTab.activePaneId);
              for (const session of restoredSessions) {
                addSession(session);
              }
            } catch {
              // Restore failed (e.g. WS not yet connected) — fall back to fresh session
              await createFreshSession(tabId, rootFolder ?? undefined);
            }
          }
        }
        const targetTabId = newTabIds[activeTabIndex] ?? newTabIds[newTabIds.length - 1];
        if (targetTabId) setActiveTab(targetTabId);
      } else {
        const tabId = createTab("Workspace 1");
        await createFreshSession(tabId, rootFolder ?? undefined);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconectar PTYs após o Mac sair do modo de descanso (WS reconecta mas PTYs morrem no servidor)
  useEffect(() => {
    const handleReconnect = async () => {
      const { tabs: currentTabs } = useTabsStore.getState();
      const { sessions: currentSessions } = useSessionsStore.getState();

      for (const tab of currentTabs) {
        if (!tab.root) continue;
        const leaves = getAllLeaves(tab.root);
        for (const leaf of leaves) {
          const oldSession = Array.from(currentSessions.values()).find(
            (s) => s.paneId === leaf.id
          );
          const cwd = oldSession?.cwd || rootFolder || undefined;
          try {
            const newSessionId = await api.pty.create({ cwd });
            if (oldSession) {
              disposeTerminal(oldSession.id);
              updateLeafSessionId(tab.id, leaf.id, newSessionId);
              replaceSession(oldSession.id, {
                ...oldSession,
                id: newSessionId,
                status: "running",
                aiProcess: null,
                createdAt: Date.now(),
              });
            } else {
              updateLeafSessionId(tab.id, leaf.id, newSessionId);
              addSession({
                id: newSessionId,
                paneId: leaf.id,
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
            }
          } catch {
            // Se falhar, o usuário verá o terminal morto — não há o que fazer
          }
        }
      }
    };

    window.addEventListener("ws:reconnected", handleReconnect);
    return () => window.removeEventListener("ws:reconnected", handleReconnect);
  }, [rootFolder, addSession, replaceSession, updateLeafSessionId]);

  // Auto-save layout whenever tabs or sessions change
  useEffect(() => {
    if (!initDoneRef.current) return;
    const timer = setTimeout(() => {
      const { tabs: currentTabs, activeTabId: currentActiveTabId } = useTabsStore.getState();
      const { sessions: currentSessions } = useSessionsStore.getState();
      const activeTabIndex = Math.max(0, currentTabs.findIndex((t) => t.id === currentActiveTabId));
      const savedTabs: SavedTab[] = currentTabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        activePaneId: tab.activePaneId,
        paneCount: tab.paneCount,
        root: tab.root ? serializePaneNode(tab.root, currentSessions) : null,
      }));
      saveLayout(activeTabIndex, savedTabs);
    }, 500);
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, sessions, saveLayout]);

  useKeymap({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onNewTab: handleNewTab,
    onOpenMd: () => {
      const { tabs, activeTabId } = useTabsStore.getState()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      if (activeTab?.activePaneId) handleOpenMdPane(activeTab.id, activeTab.activePaneId)
    },
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
              onCommandPalette={() => setCommandPaletteOpen(true)}
              onNewTab={handleNewTab}
            />
          </div>
        ))}
      </div>
      <StatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenMd={handleOpenMdPane}
        onOpenSettings={() => { setCommandPaletteOpen(false); setSettingsOpen(true); track('settings_opened'); }}
      />
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShortcutReference />
      <FolderPicker />
    </div>
  );
};
