/**
 * terminalOS web runtime server.
 * Started by `npx terminalOS --start`. Serves the pre-built React frontend and
 * handles all terminal/FS operations over WebSocket so the user's local shell
 * and files are used — nothing runs on a remote server.
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import os from "os";
import fsSync from "fs";
import fsPromises from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import * as pty from "node-pty";
import { v4 as uuidv4 } from "uuid";
import chokidar, { FSWatcher } from "chokidar";
import crypto from "crypto";

// Polyfill DOMMatrix for pdf-parse in Node.js
if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: number[] | string) {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromFloat32Array() {
      return new (globalThis as any).DOMMatrix();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromFloat64Array() {
      return new (globalThis as any).DOMMatrix();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromMatrix() {
      return new (globalThis as any).DOMMatrix();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    multiply() {
      return new (globalThis as any).DOMMatrix();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translate() {
      return new (globalThis as any).DOMMatrix();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scale() {
      return new (globalThis as any).DOMMatrix();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rotate() {
      return new (globalThis as any).DOMMatrix();
    }
    toFloat32Array() {
      return new Float32Array(16);
    }
    toFloat64Array() {
      return new Float64Array(16);
    }
    toString() {
      return "matrix(1, 0, 0, 1, 0, 0)";
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth") as {
  extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
};

const execAsync = promisify(exec);

// ─── Process Detector (copied from electron/process-detector.ts) ─────────────

interface AIProcess {
  name: string;
  color: string;
}

const AI_SIGNATURES: Array<{ pattern: RegExp; name: string; color: string }> = [
  { pattern: /claude\s+code/i, name: "claude code", color: "#D4A27F" },
  { pattern: /opencode/i, name: "opencode", color: "#7FB5D4" },
  { pattern: /aider/i, name: "aider", color: "#A27FD4" },
  { pattern: /continue/i, name: "continue", color: "#7FD4A2" },
  { pattern: /\$\s*claude\b/, name: "claude code", color: "#D4A27F" },
];

const ANSI_RE =
  /\x1b\[[0-9;]*[mGKHFABCDJsu]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g;
const SHELL_PROMPT_PATTERN = /(?:^|\n)\s{0,6}[$%❯>]\s{0,2}$/;

class ProcessDetector {
  private slidingWindow = "";
  private readonly windowSize = 2048;
  private currentAI: AIProcess | null = null;
  private hasAI = false;
  private detectedAt = 0;
  private readonly gracePeriodMs = 3000;

  detect(data: string): "detected" | "exited" | null {
    this.slidingWindow = (this.slidingWindow + data).slice(-this.windowSize);
    if (!this.hasAI) {
      for (const sig of AI_SIGNATURES) {
        if (sig.pattern.test(this.slidingWindow)) {
          this.currentAI = { name: sig.name, color: sig.color };
          this.hasAI = true;
          this.detectedAt = Date.now();
          return "detected";
        }
      }
    } else {
      if (Date.now() - this.detectedAt < this.gracePeriodMs) return null;
      const plain = this.slidingWindow.replace(ANSI_RE, "");
      const lastLines = plain.split("\n").slice(-3).join("\n");
      if (SHELL_PROMPT_PATTERN.test(lastLines)) {
        this.currentAI = null;
        this.hasAI = false;
        return "exited";
      }
    }
    return null;
  }

  getCurrentAI(): AIProcess | null {
    return this.currentAI;
  }
}

// ─── PTY Manager (callback-based, no Electron) ───────────────────────────────

function createZdotdir(): string {
  const zdotdir = fsSync.mkdtempSync(path.join(os.tmpdir(), "aiterm-"));
  const zprofile = [
    "# aiTerm: source real .zprofile (restores full PATH)",
    '[ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile"',
  ].join("\n");
  fsSync.writeFileSync(path.join(zdotdir, ".zprofile"), zprofile);
  const zshrc = [
    "# aiTerm: source real .zshrc first",
    "unset ZDOTDIR",
    '[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc"',
    "",
    "_aiterm_precmd() {",
    '  printf "\\n"',
    '  PROMPT=" "',
    '  RPROMPT=""',
    '  printf "\\033]9001;%s\\007" "${CONDA_DEFAULT_ENV:-}"',
    "}",
    "precmd_functions+=(_aiterm_precmd)",
    "",
    "_aiterm_preexec() {",
    '  printf "\\x1b[1A\\x1b[2K \\x1b[1m%s\\x1b[22m\\r\\n" "$1"',
    "}",
    "preexec_functions+=(_aiterm_preexec)",
    'PROMPT=" "',
    'RPROMPT=""',
  ].join("\n");
  fsSync.writeFileSync(path.join(zdotdir, ".zshrc"), zshrc);
  return zdotdir;
}

type SendFn = (event: string, args: unknown[]) => void;

interface PtySession {
  id: string;
  pty: pty.IPty;
  buffer: string[];
  flushTimer: ReturnType<typeof setTimeout> | null;
  detector: ProcessDetector;
}

class WebPtyManager {
  private sessions = new Map<string, PtySession>();
  private resizeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private send: SendFn) {}

  create(opts: { cwd?: string; env?: Record<string, string> }): string {
    const sessionId = uuidv4();
    const shell =
      process.platform === "win32"
        ? "cmd.exe"
        : (process.env.SHELL ?? "/bin/bash");
    const cwd = opts.cwd ?? process.env.HOME ?? "/";
    const isZsh = shell.endsWith("zsh");
    const promptEnv = isZsh
      ? { ZDOTDIR: createZdotdir() }
      : { PS1: " ", PROMPT: " " };

    const shellArgs = process.platform === "win32" ? [] : ["-l"];
    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        ...promptEnv,
        ...opts.env,
      } as Record<string, string>,
    });

    const detector = new ProcessDetector();
    const session: PtySession = {
      id: sessionId,
      pty: ptyProcess,
      buffer: [],
      flushTimer: null,
      detector,
    };

    ptyProcess.onData((data) => {
      session.buffer.push(data);
      if (!session.flushTimer) {
        session.flushTimer = setTimeout(() => {
          if (session.buffer.length > 0) {
            const chunk = session.buffer.join("");
            session.buffer = [];
            session.flushTimer = null;
            this.send("pty:data", [sessionId, chunk]);
            const result = detector.detect(chunk);
            if (result === "detected") {
              const ai = detector.getCurrentAI();
              if (ai) this.send("pty:ai-detected", [sessionId, ai]);
            } else if (result === "exited") {
              this.send("pty:ai-exited", [sessionId]);
            }
          }
        }, 1);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (session.flushTimer) clearTimeout(session.flushTimer);
      this.send("pty:exit", [sessionId, exitCode ?? 0]);
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  write(sessionId: string, data: string): void {
    this.sessions.get(sessionId)?.pty.write(data);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const existing = this.resizeTimers.get(sessionId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.sessions.get(sessionId)?.pty.resize(cols, rows);
      this.resizeTimers.delete(sessionId);
    }, 50);
    this.resizeTimers.set(sessionId, timer);
  }

  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.flushTimer) clearTimeout(session.flushTimer);
      session.pty.kill();
      this.sessions.delete(sessionId);
    }
  }

  killAll(): void {
    for (const [id] of this.sessions) this.kill(id);
  }
}

// ─── FS Watcher (callback-based, no Electron) ────────────────────────────────

interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  ext: string;
  size?: number;
  contentSize?: number;
}

async function getContentSize(
  entryPath: string,
  ext: string,
): Promise<number | undefined> {
  try {
    if (ext === "pdf") {
      const buffer = await fsPromises.readFile(entryPath);
      const result = await pdfParse(buffer);
      return result.text.length;
    }
    if (ext === "docx") {
      const buffer = await fsPromises.readFile(entryPath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value.length;
    }
  } catch {
    /* fallback */
  }
  return undefined;
}

class WebFsWatcher {
  private watcher: FSWatcher | null = null;
  private watchRoot: string | null = null;

  constructor(private send: SendFn) {}

  async readDir(dirPath: string): Promise<FsEntry[]> {
    const resolved = path.resolve(dirPath);
    const entries = await fsPromises.readdir(resolved, { withFileTypes: true });
    const result: FsEntry[] = [];
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(resolved, entry.name);
        const isDirectory = entry.isDirectory();
        const ext = isDirectory
          ? ""
          : path.extname(entry.name).slice(1).toLowerCase();
        const stat = isDirectory
          ? null
          : await fsPromises.stat(entryPath).catch(() => null);
        const contentSize = isDirectory
          ? undefined
          : await getContentSize(entryPath, ext);
        result.push({
          name: entry.name,
          path: entryPath,
          isDirectory,
          ext,
          size: stat?.size,
          contentSize,
        });
      }),
    );
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  }

  async readFile(filePath: string): Promise<string> {
    return fsPromises.readFile(path.resolve(filePath), "utf8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fsPromises.writeFile(path.resolve(filePath), content, "utf8");
  }

  async mkdir(dirPath: string): Promise<void> {
    await fsPromises.mkdir(path.resolve(dirPath), { recursive: true });
  }

  async rename(srcPath: string, destPath: string): Promise<void> {
    await fsPromises.rename(path.resolve(srcPath), path.resolve(destPath));
  }

  async copyExternal(srcPath: string, destDir: string): Promise<void> {
    const src = path.resolve(srcPath);
    const dest = path.join(path.resolve(destDir), path.basename(src));
    await fsPromises.cp(src, dest, { recursive: true });
  }

  async delete(targetPath: string): Promise<void> {
    await fsPromises.rm(path.resolve(targetPath), {
      recursive: true,
      force: true,
    });
  }

  async writeBinaryFile(filePath: string, base64Data: string): Promise<void> {
    const buffer = Buffer.from(base64Data, "base64");
    await fsPromises.writeFile(path.resolve(filePath), buffer);
  }

  setWatchRoot(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    if (this.watchRoot === resolved) return;
    this.watcher?.close();
    this.watchRoot = resolved;
    this.watcher = chokidar.watch(resolved, {
      ignoreInitial: true,
      ignored: [/(^|[/\\])\../, /node_modules/, /\.git/, /dist/, /build/],
      depth: 5,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 },
    });
    const emit = (type: string, filePath: string) =>
      this.send("fs:watch", [{ type, path: filePath }]);
    this.watcher
      .on("add", (p) => emit("add", p))
      .on("addDir", (p) => emit("addDir", p))
      .on("change", (p) => emit("change", p))
      .on("unlink", (p) => emit("unlink", p))
      .on("unlinkDir", (p) => emit("unlinkDir", p));
  }

  close(): void {
    this.watcher?.close();
    this.watcher = null;
  }
}

// ─── Versions Manager (no Electron, stores in ~/.terminalos/) ────────────────

const MAX_VERSIONS = 50;

interface FileVersion {
  id: string;
  version: number;
  timestamp: number;
  content: string;
}
interface VersionMeta {
  id: string;
  version: number;
  timestamp: number;
}
interface VersionsFile {
  filePath: string;
  versions: FileVersion[];
}

class WebVersionsManager {
  private getVersionsDir(): string {
    return path.join(os.homedir(), ".terminalos", "md-versions");
  }

  private getKey(filePath: string): string {
    return crypto.createHash("sha256").update(filePath).digest("hex");
  }

  private async load(filePath: string): Promise<FileVersion[]> {
    const vFile = path.join(
      this.getVersionsDir(),
      `${this.getKey(filePath)}.json`,
    );
    try {
      const data = await fsPromises.readFile(vFile, "utf8");
      return (JSON.parse(data) as VersionsFile).versions ?? [];
    } catch {
      return [];
    }
  }

  private async persist(
    filePath: string,
    versions: FileVersion[],
  ): Promise<void> {
    const dir = this.getVersionsDir();
    await fsPromises.mkdir(dir, { recursive: true });
    const vFile = path.join(dir, `${this.getKey(filePath)}.json`);
    await fsPromises.writeFile(
      vFile,
      JSON.stringify({ filePath, versions }),
      "utf8",
    );
  }

  async saveVersion(
    filePath: string,
    content: string,
  ): Promise<VersionMeta | null> {
    const versions = await this.load(filePath);
    if (
      versions.length > 0 &&
      versions[versions.length - 1].content === content
    )
      return null;
    const nextVersion =
      versions.length > 0 ? versions[versions.length - 1].version + 1 : 1;
    const now = Date.now();
    const newVersion: FileVersion = {
      id: new Date(now).toISOString(),
      version: nextVersion,
      timestamp: now,
      content,
    };
    versions.push(newVersion);
    const pruned =
      versions.length > MAX_VERSIONS
        ? versions.slice(versions.length - MAX_VERSIONS)
        : versions;
    await this.persist(filePath, pruned);
    return {
      id: newVersion.id,
      version: newVersion.version,
      timestamp: newVersion.timestamp,
    };
  }

  async listVersions(filePath: string): Promise<VersionMeta[]> {
    const versions = await this.load(filePath);
    return versions
      .map(({ id, version, timestamp }) => ({ id, version, timestamp }))
      .reverse();
  }

  async getVersion(
    filePath: string,
    versionId: string,
  ): Promise<string | null> {
    const versions = await this.load(filePath);
    return versions.find((v) => v.id === versionId)?.content ?? null;
  }
}

// ─── Git helper ──────────────────────────────────────────────────────────────

async function getGitBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// ─── Open helper (cross-platform) ────────────────────────────────────────────

async function openUrl(target: string): Promise<void> {
  const cmd =
    process.platform === "darwin"
      ? `open "${target}"`
      : process.platform === "win32"
        ? `start "" "${target}"`
        : `xdg-open "${target}"`;
  await execAsync(cmd).catch(() => {
    /* ignore */
  });
}

// ─── WebSocket message handler ───────────────────────────────────────────────

interface WsMsg {
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
  event?: string;
  args?: unknown[];
}

function handleConnection(
  ws: WebSocket,
  versionsManager: WebVersionsManager,
  pkgVersion: string,
): void {
  const send = (event: string, args: unknown[]) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, args }));
    }
  };

  const ptyManager = new WebPtyManager(send);
  const fsWatcher = new WebFsWatcher(send);

  const respond = (id: string, result: unknown) => {
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ id, result }));
  };

  const respondError = (id: string, error: string) => {
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ id, error }));
  };

  ws.on("message", async (raw) => {
    let msg: WsMsg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const { id, method, params = {} } = msg;

    if (!method) return;

    try {
      switch (method) {
        // PTY
        case "pty:create": {
          const sessionId = ptyManager.create(
            params as { cwd?: string; env?: Record<string, string> },
          );
          if (id) respond(id, sessionId);
          break;
        }
        case "pty:write":
          ptyManager.write(params.sessionId as string, params.data as string);
          break;
        case "pty:resize":
          ptyManager.resize(
            params.sessionId as string,
            params.cols as number,
            params.rows as number,
          );
          break;
        case "pty:kill":
          ptyManager.kill(params.sessionId as string);
          if (id) respond(id, null);
          break;

        // FS
        case "fs:openFolder": {
          try {
            let cmd: string;
            if (process.platform === "darwin") {
              cmd = `osascript -e 'POSIX path of (choose folder with prompt "Select a folder:")'`;
            } else if (process.platform === "linux") {
              cmd = `zenity --file-selection --directory --title="Select a folder"`;
            } else {
              if (id) respond(id, null);
              break;
            }
            const { stdout } = await execAsync(cmd);
            if (id) respond(id, stdout.trim().replace(/\/$/, ""));
          } catch {
            if (id) respond(id, null);
          }
          break;
        }
        case "fs:readDir": {
          const entries = await fsWatcher.readDir(params.path as string);
          if (id) respond(id, entries);
          break;
        }
        case "fs:readFile": {
          const content = await fsWatcher.readFile(params.path as string);
          if (id) respond(id, content);
          break;
        }
        case "fs:writeFile":
          await fsWatcher.writeFile(
            params.path as string,
            params.content as string,
          );
          if (id) respond(id, null);
          break;
        case "fs:writeBinaryFile":
          await fsWatcher.writeBinaryFile(
            params.filePath as string,
            params.data as string,
          );
          if (id) respond(id, null);
          break;
        case "fs:mkdir":
          await fsWatcher.mkdir(params.path as string);
          if (id) respond(id, null);
          break;
        case "fs:delete":
          await fsWatcher.delete(params.path as string);
          if (id) respond(id, null);
          break;
        case "fs:setWatchRoot":
          fsWatcher.setWatchRoot(params.path as string);
          break;

        // Versions
        case "fs:versions:save": {
          const meta = await versionsManager.saveVersion(
            params.filePath as string,
            params.content as string,
          );
          if (id) respond(id, meta);
          break;
        }
        case "fs:versions:list": {
          const list = await versionsManager.listVersions(
            params.filePath as string,
          );
          if (id) respond(id, list);
          break;
        }
        case "fs:versions:get": {
          const ver = await versionsManager.getVersion(
            params.filePath as string,
            params.versionId as string,
          );
          if (id) respond(id, ver);
          break;
        }

        // App
        case "app:getVersion":
          if (id) respond(id, pkgVersion);
          break;
        case "app:getGitBranch": {
          const branch = await getGitBranch(params.cwd as string);
          if (id) respond(id, branch);
          break;
        }
        case "app:checkForUpdates":
          if (id) respond(id, null);
          break;

        // Shell
        case "shell:openExternal":
          await openUrl(params.url as string);
          break;
        case "shell:openPath":
          await openUrl(params.path as string);
          break;
        case "shell:openInFinder":
          await openUrl(params.path as string);
          break;

        // Window (no-ops in web mode)
        case "window:minimize":
        case "window:maximize":
        case "window:close":
          break;

        default:
          if (id) respondError(id, `Unknown method: ${method}`);
      }
    } catch (err) {
      if (id) respondError(id, (err as Error).message ?? "Internal error");
    }
  });

  ws.on("close", () => {
    ptyManager.killAll();
    fsWatcher.close();
  });
}

// ─── Start server ─────────────────────────────────────────────────────────────

export function startServer(port: number): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkgVersion: string = (require("../package.json") as { version: string })
    .version;

  const versionsManager = new WebVersionsManager();

  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Serve the pre-built React frontend
  const buildDir = path.resolve(__dirname, "../build");
  app.use(express.static(buildDir));

  // ---- FS: pick-folder (native OS dialog) ----
  app.get("/api/fs/pick-folder", async (_req, res) => {
    try {
      let cmd: string;
      if (process.platform === "darwin") {
        cmd = `osascript -e 'POSIX path of (choose folder with prompt "Select a folder:")'`;
      } else if (process.platform === "linux") {
        cmd = `zenity --file-selection --directory --title="Select a folder"`;
      } else if (process.platform === "win32") {
        cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Select a folder'; if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }"`;
      } else {
        return res.json({ path: null, fallback: true });
      }
      const { stdout } = await execAsync(cmd);
      const picked = stdout.trim().replace(/\/$/, "");
      res.json({ path: picked || null, fallback: false });
    } catch {
      res.json({ path: null, fallback: false });
    }
  });

  // ---- App: platform info ----
  app.get("/api/app/platform", (_req, res) => {
    res.json({ platform: process.platform });
  });

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });

  wss.on("connection", (ws) => {
    handleConnection(ws, versionsManager, pkgVersion);
  });

  httpServer.listen(port, "127.0.0.1", () => {
    const url = `http://localhost:${port}`;

    const W = "\x1b[97m";
    const GR = "\x1b[90m";
    const B = "\x1b[1m";
    const D = "\x1b[2m";
    const R = "\x1b[0m";
    const T = W + B;
    const O = GR + B;

    const logo = [
      `${T}████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗      ${O} ██████╗ ███████╗${R}`,
      `${T}   ██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║      ${O}██╔═══██╗██╔════╝${R}`,
      `${T}   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║      ${O}██║   ██║███████╗${R}`,
      `${T}   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║      ${O}██║   ██║╚════██║${R}`,
      `${T}   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗${O}╚██████╔╝███████║${R}`,
      `${T}   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝${O} ╚═════╝ ╚══════╝${R}`,
    ];

    const pad = "  ";
    console.log("");
    logo.forEach((line) => console.log(pad + line));
    console.log("");
    console.log(`${pad}${D}v${pkgVersion}  ·  terminalos.dev${R}`);
    console.log("");
    console.log(`${pad}${W}◆${R} ${B}Ready${R}  ${W}${B}${url}${R}`);
    console.log(`${pad}${D}  Opening in your browser...${R}`);
    console.log(`${pad}${D}  Press Ctrl+C to stop.${R}`);
    console.log("");

    openUrl(url).catch(() => {
      /* ignore */
    });
  });
}
