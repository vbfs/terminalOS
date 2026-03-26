import { api } from "../../api";
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
import { useWorkspaceStore } from "../../store/workspace.store";
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
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog";
import { VersionHistory } from "./VersionHistory";

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
  const setRootFolder = useWorkspaceStore((s) => s.setRootFolder);

  const handleChangeFolder = async () => {
    const folder = await api.fs.openFolder();
    if (folder) {
      setRootFolder(folder);
      browse(paneId, folder);
    }
  };
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState<"file" | "dir" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entry: FsEntry } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

  const isTextFile = (e: FsEntry) => {
    if (e.isDirectory || e.name.startsWith(".")) return false;
    const ext = e.ext.toLowerCase();
    return ext === "md" || ext === "mdx" || ext === "txt" || ext === "csv" || ext === "pdf" || ext === "docx" || ext in LANG_MAP;
  };

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
          onClick={handleChangeFolder}
          title="Change folder"
        >
          <IconFolder size={11} />
        </button>
        <span
          className={styles.pathText}
          title={browsePath}
          style={{ cursor: 'pointer' }}
          onClick={handleChangeFolder}
        >{shortPath(browsePath)}</span>
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
          <div className={styles.emptyDir}>
            <span className={styles.emptyDirIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span className={styles.emptyDirTitle}>Empty folder</span>
            <span className={styles.emptyDirHint}>Create a new file to get started</span>
          </div>
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
                {isTextFile(entry) && (entry.contentSize ?? entry.size) != null && (
                  <span className={styles.tokenCount}>{fmtTokens((entry.contentSize ?? entry.size)!)}</span>
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
                    api.shell.openInFinder(target);
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
                  onClick: () => setDeleteTarget(ctxMenu.entry.path),
                },
              ],
            },
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`Delete "${deleteTarget?.split('/').pop() ?? ''}"`}
        body="This will permanently delete the file. This action cannot be undone."
        confirmLabel="Delete"
        isDanger
        onConfirm={() => { deleteEntry(paneId, deleteTarget!); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
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

const CodeEditor = React.forwardRef<HTMLTextAreaElement, CodeEditorProps>(({
  content,
  language,
  onChange,
  onKeyDown,
}, ref) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Assign both internal ref and forwarded ref to the same element
  const combinedRef = useCallback((node: HTMLTextAreaElement | null) => {
    (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  }, [ref]);

  const highlighted = useMemo(() => {
    if (!language) return escapeHtml(content);
    try {
      return hljs.highlight(content, { language }).value;
    } catch {
      return escapeHtml(content);
    }
  }, [content, language]);

  const syncScroll = () => {
    if (internalRef.current && preRef.current) {
      preRef.current.scrollTop = internalRef.current.scrollTop;
      preRef.current.scrollLeft = internalRef.current.scrollLeft;
    }
  };

  return (
    <div className={styles.codeWrap}>
      <pre ref={preRef} className={styles.codePre} aria-hidden="true">
        <code dangerouslySetInnerHTML={{ __html: highlighted + "\n" }} />
      </pre>
      <textarea
        ref={combinedRef}
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
});

// ── Editor ────────────────────────────────────────────────────

interface EditorProps {
  paneId: string;
  filePath: string;
  content: string;
  isDirty: boolean;
  versionCount: number;
  currentVersion: number;
}

const Editor: React.FC<EditorProps> = ({
  paneId,
  filePath,
  content,
  isDirty,
  versionCount,
  currentVersion,
}) => {
  const { setContent, save, closeFile } = useMdPaneStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Syntax error state
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

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
    saveTimerRef.current = setTimeout(() => save(paneId, false), 1200);
  }, [paneId, save]);

  const handleRestore = useCallback((restoredContent: string) => {
    setContent(paneId, restoredContent);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    save(paneId, true);
  }, [paneId, setContent, save]);

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
    await api.fs.writeBinaryFile(outputPath, buffer);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(paneId, e.target.value);
    triggerAutoSave();
  };

  const handleCodeChange = (val: string) => {
    setContent(paneId, val);
    triggerAutoSave();
  };

  // Syntax error validation (debounced 500ms)
  useEffect(() => {
    if (isPdf || isMarkdown || !language) {
      setSyntaxError(null);
      return;
    }
    const timer = setTimeout(() => {
      if (language === "json") {
        try {
          JSON.parse(content);
          setSyntaxError(null);
        } catch (e) {
          setSyntaxError((e as Error).message);
        }
        return;
      }
      // Bracket matching for other languages
      const stack: string[] = [];
      const pairs: Record<string, string> = { "}": "{", "]": "[", ")": "(" };
      let inString = false;
      let stringChar = "";
      for (let i = 0; i < content.length; i++) {
        const c = content[i];
        if (inString) {
          if (c === stringChar && content[i - 1] !== "\\") inString = false;
        } else if (c === '"' || c === "'" || c === "`") {
          inString = true;
          stringChar = c;
        } else if ("{[(".includes(c)) {
          stack.push(c);
        } else if ("}])".includes(c)) {
          if (stack.pop() !== pairs[c]) {
            setSyntaxError(`Unmatched '${c}'`);
            return;
          }
        }
      }
      setSyntaxError(stack.length > 0 ? `Unclosed '${stack[stack.length - 1]}'` : null);
    }, 500);
    return () => clearTimeout(timer);
  }, [content, language, isPdf, isMarkdown]);

  // Search matches
  const matches = useMemo(() => {
    if (!searchQuery || !searchOpen) return [];
    const lower = content.toLowerCase();
    const query = searchQuery.toLowerCase();
    const results: number[] = [];
    let i = 0;
    while (i < lower.length) {
      const idx = lower.indexOf(query, i);
      if (idx === -1) break;
      results.push(idx);
      i = idx + 1;
    }
    return results;
  }, [content, searchQuery, searchOpen]);

  const jumpToMatch = useCallback((idx: number) => {
    if (matches.length === 0) return;
    const pos = matches[idx];
    const ta = isMarkdown ? markdownTextareaRef.current : codeEditorRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(pos, pos + searchQuery.length);
    const linesBefore = content.slice(0, pos).split("\n").length;
    ta.scrollTop = Math.max(0, (linesBefore - 5) * 21);
    // Return focus to search input so Enter keeps cycling through matches
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [matches, searchQuery, content, isMarkdown]);

  // Reset index when matches change (don't auto-jump — wait for explicit navigation)
  useEffect(() => {
    setMatchIndex(0);
  }, [matches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length === 0) return;
      const next = e.shiftKey
        ? (matchIndex - 1 + matches.length) % matches.length
        : (matchIndex + 1) % matches.length;
      setMatchIndex(next);
      jumpToMatch(next);
    }
  };

  // Keyboard shortcuts: Cmd+S, Cmd+F, Enter (auto-indent), Tab
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.target as HTMLTextAreaElement;

    // Cmd+S — save
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      save(paneId, true);
      return;
    }

    // Cmd+F — open search
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
      return;
    }

    // Escape — close search
    if (e.key === "Escape" && searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
      return;
    }

    // Tab / Shift+Tab — indent / dedent
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = ta;
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const spaces = value.slice(lineStart).match(/^( {1,2})/)?.[1]?.length ?? 0;
        if (spaces > 0) {
          const newContent = value.slice(0, lineStart) + value.slice(lineStart + spaces);
          setContent(paneId, newContent);
          triggerAutoSave();
          const newPos = Math.max(lineStart, selectionStart - spaces);
          requestAnimationFrame(() => ta.setSelectionRange(newPos, newPos));
        }
      } else {
        const newContent = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
        setContent(paneId, newContent);
        triggerAutoSave();
        const newPos = selectionStart + 2;
        requestAnimationFrame(() => ta.setSelectionRange(newPos, newPos));
      }
      return;
    }

    // Enter — auto-indent
    if (e.key === "Enter") {
      e.preventDefault();
      const { selectionStart, value } = ta;
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      const indent = currentLine.match(/^(\s*)/)?.[1] ?? "";
      const extraIndent = /[{([<]$/.test(currentLine.trimEnd()) ? "  " : "";
      const newContent =
        value.slice(0, selectionStart) + "\n" + indent + extraIndent + value.slice(selectionStart);
      setContent(paneId, newContent);
      triggerAutoSave();
      const newPos = selectionStart + 1 + indent.length + extraIndent.length;
      requestAnimationFrame(() => ta.setSelectionRange(newPos, newPos));
      return;
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
        {!isPdf && !isMarkdown && syntaxError && (
          <span className={styles.syntaxError} title={syntaxError}>
            ⚠ error
          </span>
        )}
        {isMarkdown && versionCount > 0 && (
          <span className={styles.versionBadge} title={`Version ${currentVersion}`}>
            v{currentVersion}
          </span>
        )}
        {isMarkdown && versionCount > 0 && (
          <button
            className={`${styles.saveBtn} ${showHistory ? styles.saveBtnActive : ''}`}
            onClick={() => setShowHistory((v) => !v)}
            title="Version history"
          >
            history
          </button>
        )}
        {!isPdf && (
          <button
            className={styles.saveBtn}
            onClick={() => save(paneId, true)}
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
        {!isPdf && searchOpen && (
          <div className={styles.searchBar}>
            <input
              ref={searchInputRef}
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search…"
              autoFocus
            />
            <span className={`${styles.searchCount} ${searchQuery && matches.length === 0 ? styles.searchNoMatch : ""}`}>
              {searchQuery ? `${matches.length > 0 ? matchIndex + 1 : 0} / ${matches.length}` : ""}
            </span>
            <button
              className={styles.searchNav}
              onClick={() => {
                const prev = (matchIndex - 1 + matches.length) % matches.length;
                setMatchIndex(prev);
                jumpToMatch(prev);
              }}
              disabled={matches.length === 0}
              title="Previous (Shift+Enter)"
            >
              ↑
            </button>
            <button
              className={styles.searchNav}
              onClick={() => {
                const next = (matchIndex + 1) % matches.length;
                setMatchIndex(next);
                jumpToMatch(next);
              }}
              disabled={matches.length === 0}
              title="Next (Enter)"
            >
              ↓
            </button>
            <button
              className={styles.searchClose}
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        )}
        {isMarkdown && showHistory && (
          <VersionHistory
            filePath={filePath}
            currentVersion={currentVersion}
            onRestore={handleRestore}
            onClose={() => setShowHistory(false)}
          />
        )}
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
                ref={markdownTextareaRef}
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
            ref={codeEditorRef}
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
    const { init, destroy, browse } = useMdPaneStore();
    const isMinimized = useTabsStore((s) => s.minimizedPanes.has(paneId));
    const toggleMinimize = useTabsStore((s) => s.toggleMinimizePane);
    const rootFolder = useWorkspaceStore((s) => s.rootFolder);

    // Initialize: prefer rootFolder over cwd if already set
    useEffect(() => {
      init(paneId, rootFolder ?? cwd);
      return () => destroy(paneId);
    }, [paneId]); // eslint-disable-line react-hooks/exhaustive-deps

    // When rootFolder changes, navigate the file browser to it
    useEffect(() => {
      if (!rootFolder) return;
      const pane = useMdPaneStore.getState().panes.get(paneId);
      if (!pane) return;
      browse(paneId, rootFolder);
    }, [rootFolder]); // eslint-disable-line react-hooks/exhaustive-deps

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
              versionCount={state.versionCount}
              currentVersion={state.currentVersion}
            />
          ))}
      </div>
    );
  },
);

MarkdownPane.displayName = "MarkdownPane";
