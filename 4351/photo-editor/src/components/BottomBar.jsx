/**
 * BottomBar.jsx
 * Bottom navigation tray — visible in portrait / mobile layout.
 * Contains: open-file, info, radial target, settings, undo/redo counts,
 * and a horizontal scrolling row of the tool shortcuts.
 */

import React, { useRef } from 'react';
import useEditorStore, { PANELS } from '../store/editorStore';
import './BottomBar.css';

// ── Icon primitives ───────────────────────────────────────────
const IconFolder   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const IconInfo     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconTarget   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconSettings = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconMenu     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6"  x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;

// ── Shortcut tools shown in mobile bottom scroll strip ────────
const SHORTCUT_TOOLS = [
  { id: PANELS.COLOR,      label: 'Color'    },
  { id: PANELS.CURVES,     label: 'Curves'   },
  { id: PANELS.LEVELS,     label: 'Levels'   },
  { id: PANELS.EFFECT,     label: 'Effect'   },
  { id: PANELS.EFFECT_II,  label: 'Effect II'},
];

export default function BottomBar({ onOpenFile }) {
  const {
    activePanel, setActivePanel,
    undoStack, redoStack, undo, redo,
    setShowInfo,
  } = useEditorStore();

  const fileInputRef = useRef(null);

  const handleFileClick = () => fileInputRef.current?.click();

  return (
    <footer className="bottombar" role="navigation" aria-label="Quick tools">
      {/* ── Row 1: Utility icon strip ── */}
      <div className="bottombar__utility-row">
        {/* Open file */}
        <button
          className="icon-btn bottombar__util-btn"
          onClick={handleFileClick}
          aria-label="Open image file"
        >
          <IconFolder />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onOpenFile) onOpenFile(file);
              e.target.value = '';
            }}
          />
        </button>

        {/* Info */}
        <button
          className="icon-btn bottombar__util-btn"
          onClick={() => setShowInfo(true)}
          aria-label="Image info"
        >
          <IconInfo />
        </button>

        {/* Radial target / histogram toggle */}
        <button
          className="icon-btn bottombar__util-btn"
          aria-label="Histogram"
        >
          <IconTarget />
        </button>

        {/* Settings */}
        <button
          className="icon-btn bottombar__util-btn"
          aria-label="Settings"
        >
          <IconSettings />
        </button>

        {/* Undo */}
        <button
          className={`icon-btn bottombar__util-btn bottombar__history-btn ${!undoStack.length ? 'disabled' : ''}`}
          onClick={undo}
          disabled={!undoStack.length}
          aria-label={`Undo (${undoStack.length})`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
          </svg>
          <span className="bottombar__count">{undoStack.length}</span>
        </button>

        {/* Redo */}
        <button
          className={`icon-btn bottombar__util-btn bottombar__history-btn ${!redoStack.length ? 'disabled' : ''}`}
          onClick={redo}
          disabled={!redoStack.length}
          aria-label={`Redo (${redoStack.length})`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-.49-4.95"/>
          </svg>
          <span className="bottombar__count">{redoStack.length}</span>
        </button>
      </div>

      {/* ── Row 2: Horizontal tool shortcut scroll strip ── */}
      <div className="bottombar__tool-strip" role="list">
        {SHORTCUT_TOOLS.map((tool) => (
          <button
            key={tool.id}
            role="listitem"
            className={`bottombar__tool-btn btn ${activePanel === tool.id ? 'active' : ''}`}
            onClick={() => setActivePanel(tool.id)}
            aria-pressed={activePanel === tool.id}
          >
            {tool.label}
          </button>
        ))}

        {/* "More" — opens full ToolGrid */}
        <button
          className="icon-btn bottombar__tool-btn bottombar__more-btn"
          aria-label="All tools"
        >
          <IconMenu />
        </button>
      </div>
    </footer>
  );
}
