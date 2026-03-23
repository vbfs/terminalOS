import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { useSessionsStore } from "../store/sessions.store";
import { useUiStore } from "../store/ui.store";
import { usePreferencesStore } from "../store/preferences.store";
import { getThemeById } from "../themes";
import { estimateCost, normalizeModel } from "../utils/pricing";
import {
  saveTerminal,
  takeTerminal,
  disposeTerminal,
} from "../lib/terminal-registry";

// Strip ANSI escape sequences before regex matching so colorized output parses correctly
const ANSI_STRIP_RE =
  /\x1b\[[0-9;]*[mGKHFABCDJsu]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g;

// Parse token count from PTY stdout
function parseTokens(data: string): number | null {
  const clean = data.replace(ANSI_STRIP_RE, "");
  // Pattern: ↑ 2.4k tokens  or  ↑ 2,400 tokens
  const m1 = clean.match(/↑\s*([\d.,]+)(k)?\s*tokens/i);
  if (m1) {
    const raw = m1[1];
    // comma followed by exactly 3 digits = thousands separator (2,400 → 2400)
    // otherwise treat as decimal (European format: 2,4 → 2.4)
    const val = /,\d{3}$/.test(raw)
      ? parseFloat(raw.replace(",", ""))
      : parseFloat(raw.replace(",", "."));
    return m1[2] ? Math.round(val * 1000) : Math.round(val);
  }
  // Pattern: tokens used: 18234
  const m2 = clean.match(/tokens\s+used:\s*([\d,]+)/i);
  if (m2) return parseInt(m2[1].replace(/,/g, ""));
  // Pattern: "5.2k tokens" in parentheses
  const m3 = clean.match(/\(\s*([\d.,]+)(k)?\s*tokens\s*\)/i);
  if (m3) {
    const raw = m3[1];
    const val = /,\d{3}$/.test(raw)
      ? parseFloat(raw.replace(",", ""))
      : parseFloat(raw.replace(",", "."));
    return m3[2] ? Math.round(val * 1000) : Math.round(val);
  }
  // Pattern: OpenCode / generic — "11,458 tokens" or "11458 tokens"
  // Negative lookbehind prevents matching mid-number (e.g. "459" inside "11,459")
  const m4 = clean.match(/(?<![,\d])([\d,]+)\s+tokens\b/i);
  if (m4) {
    const n = parseInt(m4[1].replace(/,/g, ""));
    if (n > 0) return n;
  }
  return null;
}

// Parse model name from PTY stdout (Claude Code startup banners, status lines)
function parseModel(data: string): string | null {
  const patterns = [
    // "claude-sonnet-4-5-20251001" or "(claude-opus-4)" style
    /\(?(claude-(?:opus|sonnet|haiku)[a-z0-9-]*)\)?/i,
    // "Model: claude-sonnet-4-5" or "model claude-opus-4"
    /model[:\s]+([a-z][a-z0-9._-]{4,40})/i,
    // "Using model claude-3-7-sonnet-20250219"
    /using\s+(?:model\s+)?([a-z][a-z0-9._-]{5,40})/i,
  ];
  for (const p of patterns) {
    const m = data.match(p);
    if (m?.[1]) {
      const slug = normalizeModel(m[1]);
      if (slug) return slug;
    }
  }
  return null;
}

// Parse cost directly from PTY stdout (Claude Code session summaries)
function parseCostUsd(data: string): number | null {
  const patterns = [
    /(?:total\s+)?cost[:\s]+\$?([\d.]+)/i,
    /session\s+cost[:\s]+\$?([\d.]+)/i,
    /~\$\s*([\d.]+)/,
  ];
  for (const p of patterns) {
    const m = data.match(p);
    if (m?.[1]) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v >= 0 && v < 1000) return v;
    }
  }
  return null;
}

// Parse error alert from PTY stdout
function parseAlert(data: string): string | null {
  if (/API Error:.*404.*model.*not found/i.test(data)) {
    const m = data.match(/model[:\s'"]+([^\s'"]+)/i);
    return `Model '${m?.[1] ?? "unknown"}' not found`;
  }
  if (/Auth conflict.*ANTHROPIC_AUTH_TOKEN/i.test(data)) {
    return "Auth conflict: use ANTHROPIC_API_KEY instead of ANTHROPIC_AUTH_TOKEN";
  }
  if (/authentication.*failed/i.test(data) || /Invalid API key/i.test(data)) {
    return "API key authentication failed — check your ANTHROPIC_API_KEY";
  }
  return null;
}

interface UsePtyOptions {
  sessionId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady?: () => void;
}

export function usePty({ sessionId, containerRef, onReady }: UsePtyOptions) {
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDataRef = useRef<string[]>([]);
  const initializedRef = useRef(false);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });

  const themeId = usePreferencesStore((s) => s.themeId);
  const {
    updateStatus,
    updateCwd,
    updateCondaEnv,
    setAiProcess,
    updateTokens,
    updateModel,
    setAlert,
    getSession,
  } = useSessionsStore();

  const flushData = useCallback(() => {
    if (pendingDataRef.current.length === 0) return;
    const term = termRef.current;
    if (!term) return;
    const chunk = pendingDataRef.current.join("");
    pendingDataRef.current = [];
    term.write(chunk);
    rafRef.current = null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      if (!initializedRef.current) {
        initializedRef.current = true;

        const cached = takeTerminal(sessionId);
        if (cached) {
          // Reattach existing terminal — preserves scrollback, no Ctrl+L
          container.appendChild(cached.term.element!);
          termRef.current = cached.term;
          fitAddonRef.current = cached.fitAddon;
          searchAddonRef.current = cached.searchAddon;
          lastSizeRef.current = cached.lastSize;
          cached.fitAddon.fit();
          const { cols, rows } = cached.term;
          if (cols !== cached.lastSize.cols || rows !== cached.lastSize.rows) {
            lastSizeRef.current = { cols, rows };
            window.api.pty.resize(sessionId, cols, rows);
          }
          onReady?.();
        } else {
          const terminal = new Terminal({
            fontFamily:
              '"JetBrains Mono", "MesloLGS NF", "Hack Nerd Font", "Cascadia Code", monospace',
            fontSize: 13,
            lineHeight: 1.0,
            letterSpacing: 0,
            theme: getThemeById(usePreferencesStore.getState().themeId).term,
            allowTransparency: false,
            fastScrollModifier: "alt",
            scrollback: 5000,
            macOptionIsMeta: true,
            cursorBlink: true,
            cursorStyle: "block",
          });

          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon();
          const searchAddon = new SearchAddon();

          terminal.loadAddon(fitAddon);
          terminal.loadAddon(webLinksAddon);
          terminal.loadAddon(searchAddon);

          terminal.attachCustomKeyEventHandler((e) => {
            // Let Cmd+* combos through to global keymap
            if (e.metaKey) return false;
            return true;
          });

          terminal.open(container);
          fitAddon.fit();

          termRef.current = terminal;
          fitAddonRef.current = fitAddon;
          searchAddonRef.current = searchAddon;

          const { cols, rows } = terminal;
          lastSizeRef.current = { cols, rows };
          setTimeout(() => {
            if (!termRef.current) return;
            window.api.pty.resize(sessionId, cols, rows);
            // Ctrl+L: clears screen and redraws prompt atomically (avoids duplicate prompt)
            setTimeout(() => {
              window.api.pty.write(sessionId, "\x0c");
            }, 30);
          }, 50);

          // Forward any direct terminal input to PTY (fallback)
          terminal.onData((data) => {
            window.api.pty.write(sessionId, data);
          });

          // OSC 7: track CWD changes
          terminal.parser.registerOscHandler(7, (data) => {
            try {
              const url = new URL(data);
              updateCwd(sessionId, decodeURIComponent(url.pathname));
            } catch {
              if (data && !data.startsWith("file://"))
                updateCwd(sessionId, data);
            }
            return true;
          });

          // OSC 9001: track conda/virtual env changes (emitted by aiTerm precmd hook)
          terminal.parser.registerOscHandler(9001, (data) => {
            updateCondaEnv(sessionId, data || null);
            return true;
          });

          onReady?.();
        }
      } else {
        if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = setTimeout(() => {
          const fit = fitAddonRef.current;
          const term = termRef.current;
          if (!fit || !term) return;
          fit.fit();
          const { cols, rows } = term;
          if (
            cols !== lastSizeRef.current.cols ||
            rows !== lastSizeRef.current.rows
          ) {
            lastSizeRef.current = { cols, rows };
            window.api.pty.resize(sessionId, cols, rows);
          }
        }, 80);
      }
    });

    ro.observe(container);

    // Copy selection on mouseup, then clear it
    const handleMouseUp = () => {
      const term = termRef.current;
      if (!term) return;
      const selection = term.getSelection();
      if (!selection) return;
      navigator.clipboard.writeText(selection).then(() => {
        useUiStore.getState().setCopied("Copied!");
      });
      setTimeout(() => term.clearSelection(), 80);
    };
    document.addEventListener("mouseup", handleMouseUp);

    const unsubData = window.api.pty.onData((id, data) => {
      if (id !== sessionId) return;

      // Model detection (update first so cost estimation uses it)
      const model = parseModel(data);
      if (model !== null) updateModel(sessionId, model);

      // Token + cost parsing — only update if new value is larger (avoids
      // per-message counts overwriting the cumulative context total)
      const tokens = parseTokens(data);
      if (tokens !== null) {
        const session = getSession(sessionId);
        if (tokens >= (session?.tokens ?? 0)) {
          const parsedCost = parseCostUsd(data);
          const effectiveModel = model ?? session?.model ?? null;
          const costUsd = parsedCost ?? estimateCost(tokens, effectiveModel);
          updateTokens(sessionId, tokens, costUsd);
        }
      }

      // Alert parsing
      const alert = parseAlert(data);
      if (alert !== null) setAlert(sessionId, alert);

      pendingDataRef.current.push(data);
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushData);
      }
    });

    const unsubExit = window.api.pty.onExit((id, code) => {
      if (id !== sessionId) return;
      updateStatus(sessionId, code === 0 ? "exited" : "error", code);
      disposeTerminal(sessionId);
    });

    const unsubAiDetected = window.api.pty.onAiDetected((id, aiProcess) => {
      if (id !== sessionId) return;
      setAiProcess(sessionId, aiProcess);
      // Clear alert when AI starts fresh
      setAlert(sessionId, null);
      // Note: tokens are NOT reset here — counting belongs to the PTY session lifetime,
      // not to individual AI invocations. Resetting on re-detection caused visible
      // "up then down" behavior when the ProcessDetector falsely re-detected AI mid-session.
    });

    const unsubAiExited = window.api.pty.onAiExited((id) => {
      if (id !== sessionId) return;
      setAiProcess(sessionId, null);
      setAlert(sessionId, null);
    });

    return () => {
      ro.disconnect();
      document.removeEventListener("mouseup", handleMouseUp);
      unsubData();
      unsubExit();
      unsubAiDetected();
      unsubAiExited();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      // Save to registry instead of disposing — preserves scrollback across remounts
      if (termRef.current && fitAddonRef.current && searchAddonRef.current) {
        if (termRef.current.element?.parentElement) {
          termRef.current.element.parentElement.removeChild(
            termRef.current.element,
          );
        }
        saveTerminal(sessionId, {
          term: termRef.current,
          fitAddon: fitAddonRef.current,
          searchAddon: searchAddonRef.current,
          lastSize: lastSizeRef.current,
        });
      }
      termRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
      lastSizeRef.current = { cols: 0, rows: 0 };
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme changes to an already-initialized terminal
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getThemeById(themeId).term;
    }
  }, [themeId]);

  const search = useCallback((query: string) => {
    searchAddonRef.current?.findNext(query);
  }, []);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  const paste = useCallback((text: string) => {
    termRef.current?.paste(text);
  }, []);

  return { termRef, search, fit, paste };
}
