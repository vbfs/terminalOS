"use strict";
/**
 * terminalOS web runtime server.
 * Started by `npx terminalOS --start`. Serves the pre-built React frontend and
 * handles all terminal/FS operations over WebSocket so the user's local shell
 * and files are used — nothing runs on a remote server.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const pty = __importStar(require("node-pty"));
const uuid_1 = require("uuid");
const chokidar_1 = __importDefault(require("chokidar"));
const crypto_1 = __importDefault(require("crypto"));
// Polyfill DOMMatrix for pdf-parse in Node.js
if (typeof globalThis.DOMMatrix === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.DOMMatrix = class DOMMatrix {
        constructor(_init) {
            this.a = 1;
            this.b = 0;
            this.c = 0;
            this.d = 1;
            this.e = 0;
            this.f = 0;
            this.m11 = 1;
            this.m12 = 0;
            this.m13 = 0;
            this.m14 = 0;
            this.m21 = 0;
            this.m22 = 1;
            this.m23 = 0;
            this.m24 = 0;
            this.m31 = 0;
            this.m32 = 0;
            this.m33 = 1;
            this.m34 = 0;
            this.m41 = 0;
            this.m42 = 0;
            this.m43 = 0;
            this.m44 = 1;
            this.is2D = true;
            this.isIdentity = true;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        static fromFloat32Array() {
            return new globalThis.DOMMatrix();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        static fromFloat64Array() {
            return new globalThis.DOMMatrix();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        static fromMatrix() {
            return new globalThis.DOMMatrix();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        multiply() {
            return new globalThis.DOMMatrix();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        translate() {
            return new globalThis.DOMMatrix();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scale() {
            return new globalThis.DOMMatrix();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rotate() {
            return new globalThis.DOMMatrix();
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
const pdfParse = require("pdf-parse");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const AI_SIGNATURES = [
    { pattern: /claude\s+code/i, name: "claude code", color: "#D4A27F" },
    { pattern: /opencode/i, name: "opencode", color: "#7FB5D4" },
    { pattern: /aider/i, name: "aider", color: "#A27FD4" },
    { pattern: /continue/i, name: "continue", color: "#7FD4A2" },
    { pattern: /\$\s*claude\b/, name: "claude code", color: "#D4A27F" },
];
const ANSI_RE = /\x1b\[[0-9;]*[mGKHFABCDJsu]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g;
const SHELL_PROMPT_PATTERN = /(?:^|\n)\s{0,6}[$%❯>]\s{0,2}$/;
class ProcessDetector {
    constructor() {
        this.slidingWindow = "";
        this.windowSize = 2048;
        this.currentAI = null;
        this.hasAI = false;
        this.detectedAt = 0;
        this.gracePeriodMs = 3000;
    }
    detect(data) {
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
        }
        else {
            if (Date.now() - this.detectedAt < this.gracePeriodMs)
                return null;
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
    getCurrentAI() {
        return this.currentAI;
    }
}
// ─── PTY Manager (callback-based, no Electron) ───────────────────────────────
function createZdotdir() {
    const zdotdir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "aiterm-"));
    const zprofile = [
        "# aiTerm: source real .zprofile (restores full PATH)",
        '[ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile"',
    ].join("\n");
    fs_1.default.writeFileSync(path_1.default.join(zdotdir, ".zprofile"), zprofile);
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
    fs_1.default.writeFileSync(path_1.default.join(zdotdir, ".zshrc"), zshrc);
    return zdotdir;
}
class WebPtyManager {
    constructor(send) {
        this.send = send;
        this.sessions = new Map();
        this.resizeTimers = new Map();
    }
    create(opts) {
        const sessionId = (0, uuid_1.v4)();
        const shell = process.platform === "win32"
            ? "cmd.exe"
            : (process.env.SHELL ?? "/bin/bash");
        const cwd = opts.cwd ?? process.env.HOME ?? "/";
        const isZsh = shell.endsWith("zsh");
        const promptEnv = isZsh
            ? { ZDOTDIR: createZdotdir() }
            : { PS1: " ", PROMPT: " " };
        const ptyProcess = pty.spawn(shell, ["-l"], {
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
            },
        });
        const detector = new ProcessDetector();
        const session = {
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
                            if (ai)
                                this.send("pty:ai-detected", [sessionId, ai]);
                        }
                        else if (result === "exited") {
                            this.send("pty:ai-exited", [sessionId]);
                        }
                    }
                }, 1);
            }
        });
        ptyProcess.onExit(({ exitCode }) => {
            if (session.flushTimer)
                clearTimeout(session.flushTimer);
            this.send("pty:exit", [sessionId, exitCode ?? 0]);
            this.sessions.delete(sessionId);
        });
        this.sessions.set(sessionId, session);
        return sessionId;
    }
    write(sessionId, data) {
        this.sessions.get(sessionId)?.pty.write(data);
    }
    resize(sessionId, cols, rows) {
        const existing = this.resizeTimers.get(sessionId);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => {
            this.sessions.get(sessionId)?.pty.resize(cols, rows);
            this.resizeTimers.delete(sessionId);
        }, 50);
        this.resizeTimers.set(sessionId, timer);
    }
    kill(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (session.flushTimer)
                clearTimeout(session.flushTimer);
            session.pty.kill();
            this.sessions.delete(sessionId);
        }
    }
    killAll() {
        for (const [id] of this.sessions)
            this.kill(id);
    }
}
async function getContentSize(entryPath, ext) {
    try {
        if (ext === "pdf") {
            const buffer = await promises_1.default.readFile(entryPath);
            const result = await pdfParse(buffer);
            return result.text.length;
        }
        if (ext === "docx") {
            const buffer = await promises_1.default.readFile(entryPath);
            const result = await mammoth.extractRawText({ buffer });
            return result.value.length;
        }
    }
    catch {
        /* fallback */
    }
    return undefined;
}
class WebFsWatcher {
    constructor(send) {
        this.send = send;
        this.watcher = null;
        this.watchRoot = null;
    }
    async readDir(dirPath) {
        const resolved = path_1.default.resolve(dirPath);
        const entries = await promises_1.default.readdir(resolved, { withFileTypes: true });
        const result = [];
        await Promise.all(entries.map(async (entry) => {
            const entryPath = path_1.default.join(resolved, entry.name);
            const isDirectory = entry.isDirectory();
            const ext = isDirectory
                ? ""
                : path_1.default.extname(entry.name).slice(1).toLowerCase();
            const stat = isDirectory
                ? null
                : await promises_1.default.stat(entryPath).catch(() => null);
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
        }));
        result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory)
                return -1;
            if (!a.isDirectory && b.isDirectory)
                return 1;
            return a.name.localeCompare(b.name);
        });
        return result;
    }
    async readFile(filePath) {
        return promises_1.default.readFile(path_1.default.resolve(filePath), "utf8");
    }
    async writeFile(filePath, content) {
        await promises_1.default.writeFile(path_1.default.resolve(filePath), content, "utf8");
    }
    async mkdir(dirPath) {
        await promises_1.default.mkdir(path_1.default.resolve(dirPath), { recursive: true });
    }
    async rename(srcPath, destPath) {
        await promises_1.default.rename(path_1.default.resolve(srcPath), path_1.default.resolve(destPath));
    }
    async copyExternal(srcPath, destDir) {
        const src = path_1.default.resolve(srcPath);
        const dest = path_1.default.join(path_1.default.resolve(destDir), path_1.default.basename(src));
        await promises_1.default.cp(src, dest, { recursive: true });
    }
    async delete(targetPath) {
        await promises_1.default.rm(path_1.default.resolve(targetPath), {
            recursive: true,
            force: true,
        });
    }
    async writeBinaryFile(filePath, base64Data) {
        const buffer = Buffer.from(base64Data, "base64");
        await promises_1.default.writeFile(path_1.default.resolve(filePath), buffer);
    }
    setWatchRoot(rootPath) {
        const resolved = path_1.default.resolve(rootPath);
        if (this.watchRoot === resolved)
            return;
        this.watcher?.close();
        this.watchRoot = resolved;
        this.watcher = chokidar_1.default.watch(resolved, {
            ignoreInitial: true,
            ignored: [/(^|[/\\])\../, /node_modules/, /\.git/, /dist/, /build/],
            depth: 5,
            awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 },
        });
        const emit = (type, filePath) => this.send("fs:watch", [{ type, path: filePath }]);
        this.watcher
            .on("add", (p) => emit("add", p))
            .on("addDir", (p) => emit("addDir", p))
            .on("change", (p) => emit("change", p))
            .on("unlink", (p) => emit("unlink", p))
            .on("unlinkDir", (p) => emit("unlinkDir", p));
    }
    close() {
        this.watcher?.close();
        this.watcher = null;
    }
}
// ─── Versions Manager (no Electron, stores in ~/.terminalos/) ────────────────
const MAX_VERSIONS = 50;
class WebVersionsManager {
    getVersionsDir() {
        return path_1.default.join(os_1.default.homedir(), ".terminalos", "md-versions");
    }
    getKey(filePath) {
        return crypto_1.default.createHash("sha256").update(filePath).digest("hex");
    }
    async load(filePath) {
        const vFile = path_1.default.join(this.getVersionsDir(), `${this.getKey(filePath)}.json`);
        try {
            const data = await promises_1.default.readFile(vFile, "utf8");
            return JSON.parse(data).versions ?? [];
        }
        catch {
            return [];
        }
    }
    async persist(filePath, versions) {
        const dir = this.getVersionsDir();
        await promises_1.default.mkdir(dir, { recursive: true });
        const vFile = path_1.default.join(dir, `${this.getKey(filePath)}.json`);
        await promises_1.default.writeFile(vFile, JSON.stringify({ filePath, versions }), "utf8");
    }
    async saveVersion(filePath, content) {
        const versions = await this.load(filePath);
        if (versions.length > 0 &&
            versions[versions.length - 1].content === content)
            return null;
        const nextVersion = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1;
        const now = Date.now();
        const newVersion = {
            id: new Date(now).toISOString(),
            version: nextVersion,
            timestamp: now,
            content,
        };
        versions.push(newVersion);
        const pruned = versions.length > MAX_VERSIONS
            ? versions.slice(versions.length - MAX_VERSIONS)
            : versions;
        await this.persist(filePath, pruned);
        return {
            id: newVersion.id,
            version: newVersion.version,
            timestamp: newVersion.timestamp,
        };
    }
    async listVersions(filePath) {
        const versions = await this.load(filePath);
        return versions
            .map(({ id, version, timestamp }) => ({ id, version, timestamp }))
            .reverse();
    }
    async getVersion(filePath, versionId) {
        const versions = await this.load(filePath);
        return versions.find((v) => v.id === versionId)?.content ?? null;
    }
}
// ─── Git helper ──────────────────────────────────────────────────────────────
async function getGitBranch(cwd) {
    try {
        const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
            cwd,
        });
        return stdout.trim() || null;
    }
    catch {
        return null;
    }
}
// ─── Open helper (cross-platform) ────────────────────────────────────────────
async function openUrl(target) {
    const cmd = process.platform === "darwin"
        ? `open "${target}"`
        : process.platform === "win32"
            ? `start "" "${target}"`
            : `xdg-open "${target}"`;
    await execAsync(cmd).catch(() => {
        /* ignore */
    });
}
function handleConnection(ws, versionsManager, pkgVersion) {
    const send = (event, args) => {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ event, args }));
        }
    };
    const ptyManager = new WebPtyManager(send);
    const fsWatcher = new WebFsWatcher(send);
    const respond = (id, result) => {
        if (ws.readyState === ws_1.WebSocket.OPEN)
            ws.send(JSON.stringify({ id, result }));
    };
    const respondError = (id, error) => {
        if (ws.readyState === ws_1.WebSocket.OPEN)
            ws.send(JSON.stringify({ id, error }));
    };
    ws.on("message", async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        }
        catch {
            return;
        }
        const { id, method, params = {} } = msg;
        if (!method)
            return;
        try {
            switch (method) {
                // PTY
                case "pty:create": {
                    const sessionId = ptyManager.create(params);
                    if (id)
                        respond(id, sessionId);
                    break;
                }
                case "pty:write":
                    ptyManager.write(params.sessionId, params.data);
                    break;
                case "pty:resize":
                    ptyManager.resize(params.sessionId, params.cols, params.rows);
                    break;
                case "pty:kill":
                    ptyManager.kill(params.sessionId);
                    if (id)
                        respond(id, null);
                    break;
                // FS
                case "fs:openFolder": {
                    try {
                        let cmd;
                        if (process.platform === "darwin") {
                            cmd = `osascript -e 'POSIX path of (choose folder with prompt "Select a folder:")'`;
                        }
                        else if (process.platform === "linux") {
                            cmd = `zenity --file-selection --directory --title="Select a folder"`;
                        }
                        else {
                            if (id)
                                respond(id, null);
                            break;
                        }
                        const { stdout } = await execAsync(cmd);
                        if (id)
                            respond(id, stdout.trim().replace(/\/$/, ""));
                    }
                    catch {
                        if (id)
                            respond(id, null);
                    }
                    break;
                }
                case "fs:readDir": {
                    const entries = await fsWatcher.readDir(params.path);
                    if (id)
                        respond(id, entries);
                    break;
                }
                case "fs:readFile": {
                    const content = await fsWatcher.readFile(params.path);
                    if (id)
                        respond(id, content);
                    break;
                }
                case "fs:writeFile":
                    await fsWatcher.writeFile(params.path, params.content);
                    if (id)
                        respond(id, null);
                    break;
                case "fs:writeBinaryFile":
                    await fsWatcher.writeBinaryFile(params.filePath, params.data);
                    if (id)
                        respond(id, null);
                    break;
                case "fs:mkdir":
                    await fsWatcher.mkdir(params.path);
                    if (id)
                        respond(id, null);
                    break;
                case "fs:delete":
                    await fsWatcher.delete(params.path);
                    if (id)
                        respond(id, null);
                    break;
                case "fs:setWatchRoot":
                    fsWatcher.setWatchRoot(params.path);
                    break;
                // Versions
                case "fs:versions:save": {
                    const meta = await versionsManager.saveVersion(params.filePath, params.content);
                    if (id)
                        respond(id, meta);
                    break;
                }
                case "fs:versions:list": {
                    const list = await versionsManager.listVersions(params.filePath);
                    if (id)
                        respond(id, list);
                    break;
                }
                case "fs:versions:get": {
                    const ver = await versionsManager.getVersion(params.filePath, params.versionId);
                    if (id)
                        respond(id, ver);
                    break;
                }
                // App
                case "app:getVersion":
                    if (id)
                        respond(id, pkgVersion);
                    break;
                case "app:getGitBranch": {
                    const branch = await getGitBranch(params.cwd);
                    if (id)
                        respond(id, branch);
                    break;
                }
                case "app:checkForUpdates":
                    if (id)
                        respond(id, null);
                    break;
                // Shell
                case "shell:openExternal":
                    await openUrl(params.url);
                    break;
                case "shell:openPath":
                    await openUrl(params.path);
                    break;
                case "shell:openInFinder":
                    await openUrl(params.path);
                    break;
                // Window (no-ops in web mode)
                case "window:minimize":
                case "window:maximize":
                case "window:close":
                    break;
                default:
                    if (id)
                        respondError(id, `Unknown method: ${method}`);
            }
        }
        catch (err) {
            if (id)
                respondError(id, err.message ?? "Internal error");
        }
    });
    ws.on("close", () => {
        ptyManager.killAll();
        fsWatcher.close();
    });
}
// ─── Start server ─────────────────────────────────────────────────────────────
function startServer(port) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkgVersion = require("../package.json")
        .version;
    const versionsManager = new WebVersionsManager();
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    const wss = new ws_1.WebSocketServer({ server: httpServer, path: "/ws" });
    // Serve the pre-built React frontend
    const buildDir = path_1.default.resolve(__dirname, "../build");
    app.use(express_1.default.static(buildDir));
    // ---- FS: pick-folder (native OS dialog) ----
    app.get("/api/fs/pick-folder", async (_req, res) => {
        try {
            let cmd;
            if (process.platform === "darwin") {
                cmd = `osascript -e 'POSIX path of (choose folder with prompt "Select a folder:")'`;
            }
            else if (process.platform === "linux") {
                cmd = `zenity --file-selection --directory --title="Select a folder"`;
            }
            else {
                return res.json({ path: null });
            }
            const { stdout } = await execAsync(cmd);
            res.json({ path: stdout.trim().replace(/\/$/, "") });
        }
        catch {
            res.json({ path: null });
        }
    });
    // SPA fallback
    app.get("*", (_req, res) => {
        res.sendFile(path_1.default.join(buildDir, "index.html"));
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
