import React, { useEffect, useCallback, useRef, useState } from 'react'
import { marked } from 'marked'
import styles from './MarkdownPane.module.css'
import { useMdPaneStore } from '../../store/mdpane.store'
import type { FsEntry } from '../../store/mdpane.store'

// Configure marked for clean output
marked.setOptions({ gfm: true, breaks: true })

interface MarkdownPaneProps {
  paneId: string
  cwd: string
  isActive: boolean
  canClose: boolean
  onClose: (paneId: string) => void
  onFocus: (paneId: string) => void
}

// ── File Browser ──────────────────────────────────────────────

interface FileBrowserProps {
  paneId: string
  browsePath: string
  entries: FsEntry[]
  isLoading: boolean
}

const FileBrowser: React.FC<FileBrowserProps> = ({ paneId, browsePath, entries, isLoading }) => {
  const { browse, openFile, goUp } = useMdPaneStore()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 30)
  }, [creating])

  const { newFile, newDir } = useMdPaneStore()

  const handleCreate = async () => {
    if (!newName.trim()) { setCreating(null); return }
    const name = newName.trim()
    setCreating(null)
    setNewName('')
    if (creating === 'file') {
      const fileName = name.includes('.') ? name : name + '.md'
      await newFile(paneId, fileName)
    } else {
      await newDir(paneId, name)
    }
  }

  const handleEntryClick = (entry: FsEntry) => {
    if (entry.isDirectory) {
      browse(paneId, entry.path)
    } else {
      openFile(paneId, entry.path)
    }
  }

  const shortPath = (p: string) => {
    const replaced = p.replace(/^\/Users\/[^/]+/, '~')
    const parts = replaced.split('/')
    return parts.slice(-2).join('/')
  }

  const isMd = (e: FsEntry) => !e.isDirectory && (e.ext === 'md' || e.ext === 'mdx')

  return (
    <div className={styles.browser}>
      <div className={styles.browserPath}>
        <button className={styles.upBtn} onClick={() => goUp(paneId)} title="Go up">
          ↑
        </button>
        <span className={styles.pathText}>{shortPath(browsePath)}</span>
        <div className={styles.createBtns}>
          <button className={styles.createBtn} onClick={() => setCreating('file')} title="New file">
            + file
          </button>
          <button className={styles.createBtn} onClick={() => setCreating('dir')} title="New folder">
            + folder
          </button>
        </div>
      </div>

      {creating && (
        <div className={styles.newEntryRow}>
          <span className={styles.newEntryIcon}>{creating === 'dir' ? '▶' : '◆'}</span>
          <input
            ref={inputRef}
            className={styles.newEntryInput}
            placeholder={creating === 'dir' ? 'folder-name' : 'file.md'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(null); setNewName('') }
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
            className={`${styles.entry} ${isMd(entry) ? styles.mdEntry : ''} ${entry.isDirectory ? styles.dirEntry : ''}`}
            onClick={() => handleEntryClick(entry)}
          >
            <span className={styles.entryIcon}>
              {entry.isDirectory ? '▶' : isMd(entry) ? '◆' : '·'}
            </span>
            <span className={styles.entryName}>{entry.name}</span>
            {isMd(entry) && <span className={styles.mdBadge}>md</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────

interface EditorProps {
  paneId: string
  filePath: string
  content: string
  isDirty: boolean
}

const Editor: React.FC<EditorProps> = ({ paneId, filePath, content, isDirty }) => {
  const { setContent, save, closeFile } = useMdPaneStore()
  const previewRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<{ preview: number }>({ preview: 0 })

  const filename = filePath.split('/').pop() ?? filePath

  const html = marked.parse(content) as string

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => save(paneId), 1200)
  }, [paneId, save])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(paneId, e.target.value)
    triggerAutoSave()
  }

  // Cmd+S
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      save(paneId)
    }
  }

  return (
    <div className={styles.editorLayout}>
      <div className={styles.editorHeader}>
        <button className={styles.backBtn} onClick={() => closeFile(paneId)} title="Back to files">
          ←
        </button>
        <span className={styles.filename}>{filename}</span>
        {isDirty && <span className={styles.dirtyDot} title="Unsaved changes">●</span>}
        {!isDirty && <span className={styles.savedLabel}>saved</span>}
        <button className={styles.saveBtn} onClick={() => save(paneId)} title="Save (⌘S)">
          save
        </button>
      </div>

      <div className={styles.editorBody}>
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
      </div>
    </div>
  )
}

// ── Main MarkdownPane ─────────────────────────────────────────

export const MarkdownPane: React.FC<MarkdownPaneProps> = React.memo(
  ({ paneId, cwd, isActive, canClose, onClose, onFocus }) => {
    const state = useMdPaneStore((s) => s.panes.get(paneId))
    const { init, destroy } = useMdPaneStore()

    useEffect(() => {
      init(paneId, cwd)
      return () => destroy(paneId)
    }, [paneId, cwd]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!state) return null

    const isDirty = state.content !== state.savedContent

    return (
      <div
        className={`${styles.pane} ${isActive ? styles.focused : ''}`}
        onMouseDown={() => onFocus(paneId)}
      >
        {/* Header */}
        <div className={`${styles.header} ${isActive ? styles.headerFocused : ''}`}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>◆</span>
            <span className={styles.headerLabel}>
              {state.filePath
                ? state.filePath.split('/').pop()
                : 'Markdown'}
            </span>
          </div>
          <div className={styles.headerActions}>
            {canClose && (
              <button
                className={`${styles.headerBtn} ${styles.closeBtn}`}
                onClick={(e) => { e.stopPropagation(); onClose(paneId) }}
                title="Close pane"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {state.view === 'browser' || !state.filePath ? (
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
        )}
      </div>
    )
  }
)

MarkdownPane.displayName = 'MarkdownPane'
