/**
 * TopBar.jsx
 * Universal top navigation bar.
 * Displays: back arrow, filename, image dimensions, zoom selector,
 * fit/expand toggle, confirm checkmark, download icon, overflow menu.
 */

import React, { useCallback } from 'react';
import useEditorStore from '../store/editorStore';
import './TopBar.css';

// ── SVG icon primitives ───────────────────────────────────────
const IconBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconExpand   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
const IconSwap     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const IconCheck    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconDownload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconMore     = () => <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5"  r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>;

// ── Zoom Selector Dropdown ─────────────────────────────────────
const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 300, 400];

function ZoomSelector({ zoom, setZoom, toggleFitMode }) {
  const handleChange = useCallback((e) => {
    const v = parseInt(e.target.value, 10);
    if (v === 0) toggleFitMode();
    else setZoom(v);
  }, [setZoom, toggleFitMode]);

  return (
    <div className="topbar__zoom">
      <select
        className="topbar__zoom-select"
        value={zoom}
        onChange={handleChange}
        aria-label="Zoom level"
      >
        <option value={0}>Fit</option>
        {ZOOM_PRESETS.map((p) => (
          <option key={p} value={p}>{p}%</option>
        ))}
      </select>
      <span className="topbar__zoom-label" aria-hidden="true">
        {zoom}% ▾
      </span>
    </div>
  );
}

// ── Main TopBar ───────────────────────────────────────────────
export default function TopBar({ onBack, onApply }) {
  const {
    image, zoom, undoStack, redoStack,
    setZoom, toggleFitMode, undo, redo,
    setShowExportModal, activePanel, closePanel,
  } = useEditorStore();

  const hasUndo = undoStack.length > 0;
  const hasRedo = redoStack.length > 0;

  // In a tool panel context, top-right shows confirm checkmark
  const inToolMode = activePanel !== 'none';

  const handleApply = () => {
    if (onApply) onApply();
    else closePanel();
  };

  return (
    <header className="topbar" role="banner">
      {/* Left cluster */}
      <div className="topbar__left">
        <button
          className="icon-btn topbar__icon-btn"
          onClick={inToolMode ? closePanel : onBack}
          aria-label={inToolMode ? 'Cancel tool' : 'Go back'}
        >
          <IconBack />
        </button>

        <div className="topbar__file-info">
          {image.fileName && (
            <span className="topbar__filename" title={image.fileName}>
              {image.fileName}
            </span>
          )}
          {image.width > 0 && (
            <span className="topbar__dimensions">
              {image.width} × {image.height}
              {image.megapixels > 0 && ` · ${image.megapixels} MP`}
            </span>
          )}
        </div>
      </div>

      {/* Right cluster */}
      <div className="topbar__right">
        {/* Fit / expand */}
        <button
          className="icon-btn topbar__icon-btn"
          onClick={toggleFitMode}
          aria-label="Toggle fit to screen"
        >
          <IconExpand />
        </button>

        {/* Zoom selector */}
        <ZoomSelector
          zoom={zoom}
          setZoom={setZoom}
          toggleFitMode={toggleFitMode}
        />

        {/* Swap / undo-redo shortcut */}
        <button
          className="icon-btn topbar__icon-btn"
          aria-label="Swap / compare"
        >
          <IconSwap />
        </button>

        {/* Confirm / Checkmark — blue when in tool mode */}
        <button
          className={`icon-btn topbar__icon-btn topbar__check ${inToolMode ? 'accent' : ''}`}
          onClick={handleApply}
          disabled={!inToolMode && !hasUndo}
          aria-label="Apply changes"
        >
          <IconCheck />
        </button>

        {/* Download / save */}
        <button
          className="icon-btn topbar__icon-btn topbar__download"
          onClick={() => setShowExportModal(true)}
          aria-label="Download / export"
        >
          <IconDownload />
        </button>

        {/* Overflow */}
        <button
          className="icon-btn topbar__icon-btn"
          aria-label="More options"
        >
          <IconMore />
        </button>
      </div>
    </header>
  );
}
