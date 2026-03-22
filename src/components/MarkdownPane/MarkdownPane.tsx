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
  IconFilePlus,
  IconFolderPlus,
  IconFolder,
  IconFile,
  IconMarkdownDoc,
} from "../Icons";

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
  const { browse, openFile, goUp, newFile, newDir } = useMdPaneStore();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState<"file" | "dir" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

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

      <div className={styles.entries}>
        {isLoading && <div className={styles.loadingMsg}>loading…</div>}
        {!isLoading && entries.length === 0 && (
          <div className={styles.emptyMsg}>empty directory</div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.path}
            className={`${styles.entry} ${isMd(entry) ? styles.mdEntry : ""} ${entry.isDirectory ? styles.dirEntry : ""}`}
            onClick={() => handleEntryClick(entry)}
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
            <span className={styles.entryName}>{entry.name}</span>
            {isMd(entry) && <span className={styles.mdBadge}>md</span>}
          </div>
        ))}
      </div>
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
        {isDirty && (
          <span className={styles.dirtyDot} title="Unsaved changes">
            ●
          </span>
        )}
        {!isDirty && <span className={styles.savedLabel}>saved</span>}
        <button
          className={styles.saveBtn}
          onClick={() => save(paneId)}
          title="Save (⌘S)"
        >
          save
        </button>
      </div>

      <div className={styles.editorBody}>
        {isMarkdown ? (
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
  ({ paneId, cwd, isActive, canClose, onClose, onFocus }) => {
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
                <IconRestore size={10} />
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
