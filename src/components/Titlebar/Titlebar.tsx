import React, { useState } from "react";
import styles from "./Titlebar.module.css";
import { useSessionsStore } from "../../store/sessions.store";
import { api, IS_WEB } from "../../api";

export const Titlebar: React.FC = () => {
  const [isMac] = useState(() =>
    navigator.platform.toLowerCase().includes("mac"),
  );
  const sessions = useSessionsStore((s) => s.sessions);
  const sessionCount = sessions.size;

  return (
    <div className={styles.titlebar}>
      {isMac && !IS_WEB && <div className={styles.trafficLights} />}

      <div className={styles.center}>
        <span className={styles.title}>terminalOS</span>
      </div>

      <div className={styles.right}>
        <span className={styles.sessionCount}>{sessionCount}</span>
        <span className={styles.connectedDot} />
        <span className={styles.connectedLabel}>connected</span>
      </div>

      {!isMac && !IS_WEB && (
        <div className={styles.windowControls}>
          <button
            onClick={() => api.window.minimize()}
            className={styles.winBtn}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="0" y="4.5" width="10" height="1" />
            </svg>
          </button>
          <button
            onClick={() => api.window.maximize()}
            className={styles.winBtn}
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
            onClick={() => api.window.close()}
            className={`${styles.winBtn} ${styles.closeBtn}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
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
  );
};
