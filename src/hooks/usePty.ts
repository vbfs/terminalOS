import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { CanvasAddon } from "@xterm/addon-canvas";
import { useSessionsStore } from "../store/sessions.store";
import { useUiStore } from "../store/ui.store";
import { usePreferencesStore } from "../store/preferences.store";
import { getThemeById } from "../themes";
import { estimateCost, normalizeModel } from "../utils/pricing";
import { api } from "../api";
import { track } from "../lib/amplitude";
import {
  saveTerminal,
  takeTerminal,
  disposeTerminal,
} from "../lib/terminal-registry";

const ANSI_STRIP_RE =
  /\x1b\[[0-9;]*[mGKHFABCDJsu]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g;

// --------------------------------------------------------
// 1. PARSERS (Catálogos de Regex)
// --------------------------------------------------------

function parseTokens(buffer: string): number | null {
  const clean = buffer.replace(ANSI_STRIP_RE, "");

  // Vacina Anti-Feedback Loop (Remove o próprio prompt da memória)
  const safeText = clean
    .replace(/session tokens[\s:~\d.,kK]+/gi, "")
    .replace(/workspace tokens[\s:~\d.,kK]+/gi, "");

  const patterns = [
    { rx: /([\d]{1,3}(?:[.,][\d]{3})+)\s+\d+%/gi, type: "raw" }, // OpenCode: "64,101 31%" or "64.101 31%"
    { rx: /↑\s*([\d.,]+)(k)?\s*tokens/gi, type: "k-suffix" }, // OpenCode Loading / Generic
    { rx: /\(\s*([\d.,]+)(k)?\s*tokens\s*\)/gi, type: "k-suffix" }, // Aider: "(5.2k tokens)"
    { rx: /tokens\s+used:\s*([\d.,]+)/gi, type: "raw" }, // Claude Code (comma or period thousands)
    { rx: /(?<![.,\d])([\d.,]+)\s*tokens\b/gi, type: "raw" }, // Fallback universal
  ];

  // Parse a raw number string that may use comma OR period as thousands separator
  function parseRaw(s: string): number {
    // X,XXX or X.XXX pattern = thousands separator → strip it
    if (/^\d{1,3}(?:[.,]\d{3})+$/.test(s)) {
      return parseInt(s.replace(/[,.]/g, ""), 10);
    }
    // Plain integer possibly with commas (e.g. "12,338" in some locales)
    return parseInt(s.replace(/,/g, ""), 10);
  }

  let bestMatch: RegExpMatchArray | null = null;
  let bestType: string | null = null;
  let highestIndex = -1;

  for (const { rx, type } of patterns) {
    const matches = [...safeText.matchAll(rx)];
    if (matches.length > 0) {
      const match = matches[matches.length - 1]; // O último desta regex
      if (match.index !== undefined && match.index > highestIndex) {
        highestIndex = match.index;
        bestMatch = match;
        bestType = type;
      }
    }
  }

  if (bestMatch && bestType) {
    if (bestType === "raw") {
      return parseRaw(bestMatch[1]);
    }

    if (bestType === "k-suffix") {
      const rawNum = bestMatch[1];
      const val = /[.,]\d{3}$/.test(rawNum)
        ? parseFloat(rawNum.replace(/[,.](\d{3})$/, "$1").replace(/[,.]/, "."))
        : parseFloat(rawNum.replace(",", "."));
      return bestMatch[2] ? Math.round(val * 1000) : Math.round(val);
    }
  }
  return null;
}

function getXtermScreen(term: Terminal | null): string {
  if (!term || !term.buffer || !term.buffer.active) return "";
  const buf = term.buffer.active;
  const lines: string[] = [];
  const start = Math.max(0, buf.baseY - 50);
  const end = buf.baseY + term.rows;
  for (let i = start; i <= end; i++) {
    const line = buf.getLine(i);
    if (line) lines.push(line.translateToString(true));
  }
  return lines.join("\n");
}

// Retorna true quando o AI TUI está mostrando seu prompt de input (esperando o usuário).
// Uma linha "prompt" contém apenas: espaço, > ou ❯, e caracteres de borda de box Unicode.
// Isso distingue o estado "AI esperando input" de "AI respondendo/pensando".
// O debounce de 600ms garante que > efêmeros durante tool calls não disparem parse.
function isAiWaitingForInput(term: Terminal | null): boolean {
  if (!term || !term.buffer?.active) return false;
  const buf = term.buffer.active;
  const baseY = buf.baseY;
  const rows = term.rows;
  for (let i = rows - 1; i >= Math.max(0, rows - 3); i--) {
    const raw = buf.getLine(baseY + i)?.translateToString(true) ?? "";
    // Remove: espaço, > ❯, box-drawing Unicode, cursor block
    const stripped = raw.replace(/[\s>❯│╭╮╰╯─╴╸╼╾▊▋▌]/g, "");
    if (stripped.length === 0 && /[>❯]/.test(raw)) return true;
  }
  return false;
}

function parseModel(buffer: string): string | null {
  const patterns = [
    /\(?(claude-(?:opus|sonnet|haiku)[a-z0-9-]*)\)?/gi,
    // OpenCode status bar: "▣ Agent · model-name · 14.6s" ou "· 1m 6s"
    /[▣▪]\s+\S.*?·\s*([a-z][a-z0-9._-]{3,50})\s*·\s*(?:\d+m\s*)?[\d.]+s/gi,
    /model[:\s]+([a-z][a-z0-9._-]{4,40})/gi,
    /using\s+(?:model\s+)?([a-z][a-z0-9._-]{5,40})/gi,
  ];

  for (const rx of patterns) {
    const matches = [...buffer.matchAll(rx)];
    if (matches.length > 0) {
      const slug = normalizeModel(matches[matches.length - 1][1]);
      if (slug) return slug;
    }
  }
  return null;
}

function parseCostUsd(buffer: string): number | null {
  const patterns = [
    /(?:total\s+)?cost[:\s]+\$?([\d.]+)/gi,
    /session\s+cost[:\s]+\$?([\d.]+)/gi,
    /~\$\s*([\d.]+)/gi,
  ];

  for (const rx of patterns) {
    const matches = [...buffer.matchAll(rx)];
    if (matches.length > 0) {
      const v = parseFloat(matches[matches.length - 1][1]);
      if (!isNaN(v) && v >= 0 && v < 1000) return v;
    }
  }
  return null;
}

function parseAlert(buffer: string): string | null {
  const patterns = [
    { rx: /API Error:.*404.*model.*not found/gi, type: "model_error" },
    { rx: /Auth conflict.*ANTHROPIC_AUTH_TOKEN/gi, type: "auth_conflict" },
    { rx: /authentication.*failed|Invalid API key/gi, type: "auth_error" },
  ];

  for (const { rx, type } of patterns) {
    const matches = [...buffer.matchAll(rx)];
    if (matches.length > 0) {
      if (type === "model_error") {
        // Busca o nome do modelo específico que deu erro
        const m = buffer.match(/model[:\s'"]+([^\s'"]+)/i);
        return `Model '${m?.[1] ?? "unknown"}' not found`;
      }
      if (type === "auth_conflict")
        return "Auth conflict: use ANTHROPIC_API_KEY";
      if (type === "auth_error") return "API key authentication failed";
    }
  }
  return null;
}

// --------------------------------------------------------
// 2. MAIN HOOK
// --------------------------------------------------------

interface UsePtyOptions {
  sessionId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady?: () => void;
}

export function usePty({ sessionId, containerRef, onReady }: UsePtyOptions) {
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  // Raw buffer para detectar modelo (aparece no startup, pode sair do viewport)
  const parseBufferRef = useRef<string>("");
  // Timer de idle: dispara o parse APENAS quando o AI parou de responder
  const aiIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag para saber se AI está ativo sem consultar a store a cada chunk de dados
  const isAiActiveRef = useRef<boolean>(false);
  // Último valor parseado — deduplicação para não spammar updates com mesmo valor
  const lastParsedTokensRef = useRef<number | null>(null);
  // Timestamp do último parse bem-sucedido — cooldown para não re-parsear imediatamente
  const lastParsedAtRef = useRef<number>(0);

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
  } = useSessionsStore.getState();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];

      // Width === 0 can happen mid-layout-transition (e.g. after closing a pane
      // or toggling the markdown editor). If already initialized, schedule a
      // deferred fit() so we catch the real post-paint dimensions.
      if (!entry || entry.contentRect.width === 0) {
        if (initializedRef.current) {
          if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
          resizeDebounceRef.current = setTimeout(() => {
            fitAddonRef.current?.fit();
            const term = termRef.current;
            if (term && (term.cols !== lastSizeRef.current.cols || term.rows !== lastSizeRef.current.rows)) {
              lastSizeRef.current = { cols: term.cols, rows: term.rows };
              api.pty.resize(sessionId, term.cols, term.rows);
            }
          }, 200);
        }
        return;
      }

      if (!initializedRef.current) {
        initializedRef.current = true;
        const cached = takeTerminal(sessionId);

        if (cached) {
          container.appendChild(cached.term.element!);
          termRef.current = cached.term;
          fitAddonRef.current = cached.fitAddon;
          searchAddonRef.current = cached.searchAddon;
          lastSizeRef.current = cached.lastSize;
          cached.fitAddon.fit();
          onReady?.();
        } else {
          const terminal = new Terminal({
            fontFamily:
              '"JetBrains Mono", "MesloLGS NF", "Hack Nerd Font", monospace',
            fontSize: 13,
            lineHeight: 1.0,
            theme: getThemeById(usePreferencesStore.getState().themeId).term,
            scrollback: 5000,
            cursorBlink: true,
            customGlyphs: true,
          });

          const fitAddon = new FitAddon();
          terminal.loadAddon(fitAddon);
          terminal.loadAddon(new WebLinksAddon());
          const searchAddon = new SearchAddon();
          terminal.loadAddon(searchAddon);

          terminal.open(container);
          terminal.loadAddon(new CanvasAddon());
          fitAddon.fit();

          termRef.current = terminal;
          fitAddonRef.current = fitAddon;
          searchAddonRef.current = searchAddon;

          const { cols, rows } = terminal;
          lastSizeRef.current = { cols, rows };

          setTimeout(() => {
            if (!termRef.current) return;
            api.pty.resize(sessionId, cols, rows);
            try {
              api.app.getPlatform().then((platform) => {
                if (platform !== 'win32') {
                  setTimeout(() => api.pty.write(sessionId, "\x0c"), 30);
                }
              }).catch(() => {
                setTimeout(() => api.pty.write(sessionId, "\x0c"), 30);
              });
            } catch {
              setTimeout(() => api.pty.write(sessionId, "\x0c"), 30);
            }
          }, 50);

          terminal.onData((data) => {
            if (data === '\r') track('terminal_enter', { source: 'terminal' });
            api.pty.write(sessionId, data);
          });

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

          terminal.parser.registerOscHandler(9001, (data) => {
            updateCondaEnv(sessionId, data || null);
            return true;
          });

          onReady?.();
        }
      } else {
        if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = setTimeout(() => {
          fitAddonRef.current?.fit();
          const term = termRef.current;
          if (
            term &&
            (term.cols !== lastSizeRef.current.cols ||
              term.rows !== lastSizeRef.current.rows)
          ) {
            lastSizeRef.current = { cols: term.cols, rows: term.rows };
            api.pty.resize(sessionId, term.cols, term.rows);
          }
        }, 150);
      }
    });

    ro.observe(container);

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

    // Faz o parse do estado final da tela e atualiza tokens/modelo/custo/alerta.
    // Chamado apenas quando o AI parou de responder (idle) ou saiu completamente.
    const triggerParse = (reason: string) => {
      const now = Date.now();
      // Cooldown: ignora re-parse em menos de 1.5s, exceto no "ai-exited" (parse final)
      if (reason !== "ai-exited" && now - lastParsedAtRef.current < 1500) return;
      // Avança o cooldown SEMPRE (mesmo que deduplication descarte o valor),
      // para evitar spam quando o AI envia cursor blinks com tela estável.
      lastParsedAtRef.current = now;

      const screenText = getXtermScreen(termRef.current);
      const rawBuffer = parseBufferRef.current;

      const model = parseModel(rawBuffer) ?? parseModel(screenText);
      const tokens = parseTokens(screenText);
      const costUsd = tokens !== null
        ? (parseCostUsd(screenText) ?? estimateCost(tokens, model ?? getSession(sessionId)?.model ?? null))
        : null;
      const alert = parseAlert(screenText);

      console.group(`[aiTerm parse] trigger="${reason}"`);
      console.log("screenText (últimas 20 linhas):\n" +
        screenText.split("\n").slice(-20).join("\n"));
      console.log("model:", model, "| tokens:", tokens, "| cost:", costUsd);
      console.groupEnd();

      if (model) updateModel(sessionId, model);

      if (tokens !== null && costUsd !== null) {
        // Deduplicação: só atualiza se o valor mudou
        if (tokens !== lastParsedTokensRef.current) {
          const prev = lastParsedTokensRef.current;
          const dropped = prev !== null && tokens < prev * 0.8; // queda > 20%
          console.log(`[aiTerm] tokens atualizado: ${prev} → ${tokens}${dropped ? " ⚠️ DROP" : ""}`);
          if (dropped) {
            // Log screenText completo para diagnosticar drops inesperados
            console.log("[aiTerm] SCREEN COMPLETO no drop:\n" + screenText);
          }
          lastParsedTokensRef.current = tokens;
          updateTokens(sessionId, tokens, costUsd);
        } else {
          console.log(`[aiTerm] tokens sem mudança (${tokens}), ignorando`);
        }
      }

      if (alert) setAlert(sessionId, alert);
    };

    const unsubData = api.pty.onData((id, data) => {
      if (id !== sessionId) return;

      termRef.current?.write(data);

      // Só parseia quando um AI está ativo na sessão
      if (!isAiActiveRef.current) return;

      // Acumula raw buffer para detecção de modelo (limitado aos primeiros 16KB do AI)
      if (parseBufferRef.current.length < 16384) {
        parseBufferRef.current += data;
      }

      // Debounce de 600ms: após cada chunk, aguarda 600ms sem novos dados.
      // Ao disparar, verifica se o AI está exibindo seu prompt de input na tela.
      // Isso distingue "AI terminou de responder" de "AI pensando" (sem prompt visível).
      // O 600ms também absorve > efêmeros que aparecem durante tool calls/streaming.
      if (aiIdleTimerRef.current) clearTimeout(aiIdleTimerRef.current);
      aiIdleTimerRef.current = setTimeout(() => {
        const term = termRef.current;
        const waiting = isAiWaitingForInput(term);

        // (diagnóstico removido — use DROP log abaixo para investigar regressões)

        if (waiting) {
          triggerParse("prompt-detected");
        } else {
          // Fallback: OpenCode e outros AIs sem > explícito usam área de input vazia.
          // Se a última linha visível for vazia (só cursor), considera como "esperando".
          const buf = term?.buffer?.active;
          if (buf) {
            const lastLine = buf.getLine(buf.baseY + (term?.rows ?? 0) - 1)
              ?.translateToString(true)
              ?.trimEnd() ?? "";
            if (lastLine === "") {
              console.log("[aiTerm] fallback: última linha vazia → parseando");
              triggerParse("empty-line-fallback");
            }
          }
        }
      }, 600);
    });

    const unsubExit = api.pty.onExit((id, code) => {
      if (id !== sessionId) return;
      updateStatus(sessionId, code === 0 ? "exited" : "error", code);
      disposeTerminal(sessionId);
    });

    // Restaura estado do AI se já estava ativo antes deste mount (ex: troca de tab)
    if (getSession(sessionId)?.aiProcess) {
      isAiActiveRef.current = true;
    }

    const unsubAiDetected = api.pty.onAiDetected((id, aiProcess) => {
      if (id !== sessionId) return;
      console.log(`[aiTerm] AI detectado: ${aiProcess.name} — session=${sessionId}`);
      isAiActiveRef.current = true;
      parseBufferRef.current = "";
      lastParsedTokensRef.current = null;
      lastParsedAtRef.current = 0;
      setAiProcess(sessionId, aiProcess);
      setAlert(sessionId, null);
      track('ai_detected', { agent: aiProcess.name });
    });

    const unsubAiExited = api.pty.onAiExited((id) => {
      if (id !== sessionId) return;
      console.log(`[aiTerm] AI saiu — session=${sessionId}, disparando parse final`);
      isAiActiveRef.current = false;
      if (aiIdleTimerRef.current) clearTimeout(aiIdleTimerRef.current);
      aiIdleTimerRef.current = null;
      triggerParse("ai-exited");
      parseBufferRef.current = "";
      const aiProcess = getSession(sessionId)?.aiProcess;
      track('ai_exited', { agent: aiProcess?.name ?? 'unknown' });
      setAiProcess(sessionId, null);
    });

    return () => {
      ro.disconnect();
      document.removeEventListener("mouseup", handleMouseUp);
      unsubData();
      unsubExit();
      unsubAiDetected();
      unsubAiExited();
      if (aiIdleTimerRef.current) clearTimeout(aiIdleTimerRef.current);
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);

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
  }, [sessionId]);

  useEffect(() => {
    if (termRef.current)
      termRef.current.options.theme = getThemeById(themeId).term;
  }, [themeId]);

  const search = useCallback(
    (query: string) => searchAddonRef.current?.findNext(query),
    [],
  );
  const fit = useCallback(() => fitAddonRef.current?.fit(), []);
  const paste = useCallback((text: string) => termRef.current?.paste(text), []);

  return { termRef, search, fit, paste };
}
