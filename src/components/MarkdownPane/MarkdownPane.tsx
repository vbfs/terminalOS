import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import styles from "./MarkdownPane.module.css";
import { useMdPaneStore } from "../../store/mdpane.store";
import { useTabsStore } from "../../store/tabs.store";
import type { FsEntry } from "../../store/mdpane.store";
import {
  IconX,
  IconMinus,
  IconRestore,
  IconArrowUp,
  IconArrowLeft,
  IconArrowRight,
  IconFilePlus,
  IconFolderPlus,
  IconFolder,
  IconFile,
  IconMarkdownDoc,
  IconFilePdf,
} from "../Icons";
import { ContextMenu } from "../ContextMenu/ContextMenu";

// ── Language detection ─────────────────────────────────────────
const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  css: "css",
  scss: "scss",
  less: "less",
  json: "json",
  jsonc: "json",
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  cpp: "cpp",
  cxx: "cpp",
  cc: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  sql: "sql",
  graphql: "graphql",
  lua: "lua",
  dockerfile: "dockerfile",
};

function getLang(filePath: string): string | null {
  const base = (filePath.split("/").pop() ?? "").toLowerCase();
  if (base === "dockerfile") return "dockerfile";
  if (base === "makefile") return "makefile";
  const ext = base.split(".").pop() ?? "";
  return LANG_MAP[ext] ?? null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Configure marked for clean output
marked.setOptions({ gfm: true, breaks: true });

interface MarkdownPaneProps {
  paneId: string;
  cwd: string;
  isActive: boolean;
  canClose: boolean;
  restoreDirection?: 'up' | 'left' | 'right';
  onClose: (paneId: string) => void;
  onFocus: (paneId: string) => void;
}

// ── File Browser ──────────────────────────────────────────────

interface FileBrowserProps {
  paneId: string;
  browsePath: string;
  entries: FsEntry[];
  isLoading: boolean;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  paneId,
  browsePath,
  entries,
  isLoading,
}) => {
  const { browse, openFile, goUp, newFile, newDir, moveEntry, copyExternal, deleteEntry, renameEntry } = useMdPaneStore();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState<"file" | "dir" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entry: FsEntry } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingPath) setTimeout(() => renameInputRef.current?.focus(), 30);
  }, [renamingPath]);

  const handleRenameSubmit = async () => {
    if (!renamingPath) return;
    const name = renameValue.trim();
    const path = renamingPath;
    setRenamingPath(null);
    setRenameValue("");
    if (!name) return;
    const currentName = path.split("/").pop() ?? "";
    if (name === currentName) return;
    await renameEntry(paneId, path, name);
  };

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 30);
  }, [creating]);

  const handleCreate = async () => {
    if (isSubmittingRef.current) return;
    const name = newName.trim();
    const creatingType = creating;
    setCreating(null);
    setNewName("");
    if (!name || !creatingType) return;
    isSubmittingRef.current = true;
    try {
      if (creatingType === "file") {
        const fileName = name.includes(".") ? name : name + ".md";
        await newFile(paneId, fileName);
      } else {
        await newDir(paneId, name);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleEntryClick = (entry: FsEntry) => {
    if (entry.isDirectory) {
      browse(paneId, entry.path);
    } else {
      openFile(paneId, entry.path);
    }
  };

  const shortPath = (p: string) => {
    const replaced = p.replace(/^\/Users\/[^/]+/, "~");
    const parts = replaced.split("/");
    return parts.slice(-2).join("/");
  };

  const isMd = (e: FsEntry) =>
    !e.isDirectory && (e.ext === "md" || e.ext === "mdx");

  const fmtTokens = (size: number) => {
    const t = Math.ceil(size / 4);
    return t >= 1000 ? `~${(t / 1000).toFixed(1)}k tokens` : `~${t} tokens`;
  };

  return (
    <div className={styles.browser}>
      <div className={styles.browserPath}>
        <button
          className={styles.upBtn}
          onClick={() => goUp(paneId)}
          title="Go up"
        >
          <IconArrowUp size={11} />
        </button>
        <button
          className={styles.upBtn}
          onClick={() => window.api.shell.openInFinder(browsePath)}
          title="Open in Finder"
        >
          <IconFolder size={11} />
        </button>
        <span className={styles.pathText}>{shortPath(browsePath)}</span>
        <div className={styles.createBtns}>
          <button
            className={styles.createBtn}
            onClick={() => setCreating("file")}
            title="New file"
          >
            <IconFilePlus size={12} /> file
          </button>
          <button
            className={styles.createBtn}
            onClick={() => setCreating("dir")}
            title="New folder"
          >
            <IconFolderPlus size={12} /> folder
          </button>
        </div>
      </div>

      {creating && (
        <div className={styles.newEntryRow}>
          <span className={styles.newEntryIcon}>
            {creating === "dir" ? (
              <IconFolder size={11} />
            ) : (
              <IconMarkdownDoc size={11} />
            )}
          </span>
          <input
            ref={inputRef}
            className={styles.newEntryInput}
            placeholder={creating === "dir" ? "folder-name" : "file.md"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(null);
                setNewName("");
              }
            }}
            onBlur={handleCreate}
          />
        </div>
      )}

      <div
        className={`${styles.entries} ${dragOverTarget === "__root__" ? styles.dragOver : ""}`}
        onDragOver={(e) => {
          if (draggingPath || e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOverTarget("__root__");
          }
        }}
        onDragLeave={(e) => {
          // Only clear if leaving the entries container itself
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingPath) {
            const parentDir = draggingPath.split("/").slice(0, -1).join("/");
            if (parentDir !== browsePath) {
              moveEntry(paneId, draggingPath, browsePath);
            }
          } else if (e.dataTransfer.files.length > 0) {
            const paths = Array.from(e.dataTransfer.files)
              .map((f) => (f as any).path as string)
              .filter(Boolean);
            if (paths.length > 0) copyExternal(paneId, paths, browsePath);
          }
          setDraggingPath(null);
          setDragOverTarget(null);
        }}
      >
        {isLoading && <div className={styles.loadingMsg}>loading…</div>}
        {!isLoading && entries.length === 0 && (
          <div className={styles.emptyMsg}>empty directory</div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.path}
            className={`${styles.entry} ${isMd(entry) ? styles.mdEntry : ""} ${entry.isDirectory ? styles.dirEntry : ""} ${dragOverTarget === entry.path ? styles.dragOver : ""}`}
            style={{ opacity: draggingPath === entry.path ? 0.4 : 1 }}
            onClick={() => renamingPath !== entry.path && handleEntryClick(entry)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu({ x: e.clientX, y: e.clientY, entry });
            }}
            draggable={renamingPath !== entry.path}
            onDragStart={() => setDraggingPath(entry.path)}
            onDragEnd={() => {
              setDraggingPath(null);
              setDragOverTarget(null);
            }}
            onDragOver={(e) => {
              const isExternalFile = !draggingPath && e.dataTransfer.types.includes("Files");
              if (entry.isDirectory && (draggingPath !== entry.path) && (draggingPath || isExternalFile)) {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTarget(entry.path);
              }
            }}
            onDragLeave={(e) => {
              if (dragOverTarget === entry.path && !e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverTarget(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (entry.isDirectory && draggingPath && draggingPath !== entry.path) {
                moveEntry(paneId, draggingPath, entry.path);
              } else if (entry.isDirectory && !draggingPath && e.dataTransfer.files.length > 0) {
                const paths = Array.from(e.dataTransfer.files)
                  .map((f) => (f as any).path as string)
                  .filter(Boolean);
                if (paths.length > 0) copyExternal(paneId, paths, entry.path);
              }
              setDraggingPath(null);
              setDragOverTarget(null);
            }}
          >
            <span className={styles.entryIcon}>
              {entry.isDirectory ? (
                <IconFolder size={11} />
              ) : isMd(entry) ? (
                <IconMarkdownDoc size={11} />
              ) : (
                <IconFile size={11} />
              )}
            </span>
            {renamingPath === entry.path ? (
              <input
                ref={renameInputRef}
                className={styles.newEntryInput}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") {
                    setRenamingPath(null);
                    setRenameValue("");
                  }
                }}
                onBlur={handleRenameSubmit}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className={styles.entryName}>{entry.name}</span>
                {isMd(entry) && entry.size != null && (
                  <span className={styles.tokenCount}>{fmtTokens(entry.size)}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          groups={[
            {
              items: [
                {
                  icon: "✏",
                  label: "Rename",
                  onClick: () => {
                    setRenamingPath(ctxMenu.entry.path);
                    setRenameValue(ctxMenu.entry.name);
                  },
                },
                {
                  icon: "⎆",
                  label: "Open in Finder",
                  onClick: () => {
                    const target = ctxMenu.entry.isDirectory
                      ? ctxMenu.entry.path
                      : ctxMenu.entry.path.split("/").slice(0, -1).join("/");
                    window.api.shell.openInFinder(target);
                  },
                },
              ],
            },
            {
              items: [
                {
                  icon: "✕",
                  label: "Delete",
                  danger: true,
                  onClick: () => deleteEntry(paneId, ctxMenu.entry.path),
                },
              ],
            },
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
};

// ── Code Editor (syntax-highlighted overlay) ──────────────────

interface CodeEditorProps {
  content: string;
  language: string | null;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  language,
  onChange,
  onKeyDown,
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const highlighted = useMemo(() => {
    if (!language) return escapeHtml(content);
    try {
      return hljs.highlight(content, { language }).value;
    } catch {
      return escapeHtml(content);
    }
  }, [content, language]);

  const syncScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  return (
    <div className={styles.codeWrap}>
      <pre ref={preRef} className={styles.codePre} aria-hidden="true">
        <code dangerouslySetInnerHTML={{ __html: highlighted + "\n" }} />
      </pre>
      <textarea
        ref={taRef}
        className={styles.codeTextarea}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
      />
    </div>
  );
};

// ── Editor ────────────────────────────────────────────────────

interface EditorProps {
  paneId: string;
  filePath: string;
  content: string;
  isDirty: boolean;
}

const Editor: React.FC<EditorProps> = ({
  paneId,
  filePath,
  content,
  isDirty,
}) => {
  const { setContent, save, closeFile } = useMdPaneStore();
  const previewRef = useRef<HTMLDivElement>(null);

  const filename = filePath.split("/").pop() ?? filePath;
  const isMarkdown = filePath.endsWith(".md") || filePath.endsWith(".mdx");
  const isPdf = filePath.endsWith(".pdf");
  const language = isMarkdown ? null : getLang(filePath);

  const fileDir = filePath.split("/").slice(0, -1).join("/");

  const html = useMemo(() => {
    if (!isMarkdown) return "";
    const raw = marked.parse(content) as string;
    // Resolve relative image paths to absolute file:// URLs
    return raw.replace(
      /(<img\s[^>]*src=")([^"]+)(")/gi,
      (_, pre, src, post) => {
        if (/^(https?:|data:|file:|\/)/i.test(src)) return pre + src + post;
        return pre + "file://" + fileDir + "/" + src + post;
      },
    );
  }, [content, isMarkdown, fileDir]);

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(paneId), 1200);
  }, [paneId, save]);

  const exportPdf = async () => {
    if (!previewRef.current || !isMarkdown) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const outputPath = filePath.replace(/\.mdx?$/i, ".pdf");
    const buffer: ArrayBuffer = await html2pdf()
      .set({
        margin: [10, 15],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0d0d0d" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(previewRef.current)
      .output("arraybuffer");
    await window.api.fs.writeBinaryFile(outputPath, buffer);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(paneId, e.target.value);
    triggerAutoSave();
  };

  const handleCodeChange = (val: string) => {
    setContent(paneId, val);
    triggerAutoSave();
  };

  // Cmd+S
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      save(paneId);
    }
  };

  return (
    <div className={styles.editorLayout}>
      <div className={styles.editorHeader}>
        <button
          className={styles.backBtn}
          onClick={() => closeFile(paneId)}
          title="Back to files"
        >
          <IconArrowLeft size={12} />
        </button>
        <span className={styles.filename}>{filename}</span>
        {!isPdf && isDirty && (
          <span className={styles.dirtyDot} title="Unsaved changes">
            ●
          </span>
        )}
        {!isPdf && !isDirty && <span className={styles.savedLabel}>saved</span>}
        {!isPdf && (
          <button
            className={styles.saveBtn}
            onClick={() => save(paneId)}
            title="Save (⌘S)"
          >
            save
          </button>
        )}
        {isMarkdown && (
          <button
            className={styles.saveBtn}
            onClick={exportPdf}
            title="Export as PDF"
          >
            <IconFilePdf size={12} /> export pdf
          </button>
        )}
      </div>

      <div className={styles.editorBody}>
        {isPdf ? (
          <iframe
            className={styles.pdfViewer}
            src={`localfile://${filePath}`}
            title={filename}
          />
        ) : isMarkdown ? (
          <>
            <div className={styles.editorSide}>
              <textarea
                className={styles.textarea}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
            <div className={styles.editorDivider} />
            <div
              ref={previewRef}
              className={styles.preview}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </>
        ) : (
          <CodeEditor
            content={content}
            language={language}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
    </div>
  );
};

// ── Main MarkdownPane ─────────────────────────────────────────

export const MarkdownPane: React.FC<MarkdownPaneProps> = React.memo(
  ({ paneId, cwd, isActive, canClose, restoreDirection = 'up', onClose, onFocus }) => {
    const state = useMdPaneStore((s) => s.panes.get(paneId));
    const { init, destroy } = useMdPaneStore();
    const isMinimized = useTabsStore((s) => s.minimizedPanes.has(paneId));
    const toggleMinimize = useTabsStore((s) => s.toggleMinimizePane);

    useEffect(() => {
      init(paneId, cwd);
      return () => destroy(paneId);
    }, [paneId, cwd]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!state) return null;

    const isDirty = state.content !== state.savedContent;

    return (
      <div
        className={`${styles.pane} ${isActive ? styles.focused : ""} ${isMinimized ? styles.minimized : ""}`}
        onMouseDown={() => onFocus(paneId)}
      >
        {/* Header */}
        <div
          className={`${styles.header} ${isActive ? styles.headerFocused : ""}`}
        >
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              <IconMarkdownDoc size={12} />
            </span>
            <span className={styles.headerLabel}>{"Editor"}</span>
          </div>
          <div
            className={`${styles.headerActions} ${isMinimized ? styles.headerActionsMinimized : ""}`}
          >
            <button
              className={`${styles.headerBtn} ${styles.minimizeBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize(paneId);
              }}
              title={isMinimized ? "Restore pane" : "Minimize pane"}
            >
              {isMinimized ? (
                restoreDirection === 'left'
                  ? <IconArrowLeft size={10} />
                  : restoreDirection === 'right'
                    ? <IconArrowRight size={10} />
                    : <IconRestore size={10} />
              ) : (
                <IconMinus size={10} />
              )}
            </button>
            {!isMinimized && canClose && (
              <button
                className={`${styles.headerBtn} ${styles.closeBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(paneId);
                }}
                title="Close pane"
              >
                <IconX size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Content – hidden when minimized */}
        {!isMinimized &&
          (state.view === "browser" || !state.filePath ? (
            <FileBrowser
              paneId={paneId}
              browsePath={state.browsePath}
              entries={state.entries}
              isLoading={state.isLoading}
            />
          ) : (
            <Editor
              paneId={paneId}
              filePath={state.filePath}
              content={state.content}
              isDirty={isDirty}
            />
          ))}
      </div>
    );
  },
);

MarkdownPane.displayName = "MarkdownPane";
