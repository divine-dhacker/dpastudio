/**
 * App.jsx — PixelCraft Photo Editor
 *
 * Renders one of two screens based on Zustand `view` state:
 *   'home'   → HomeDashboard  (icon grid matching the reference screenshot)
 *   'editor' → EditorWorkspace (canvas + toolbar)
 *
 * Image loading is fully wired: Gallery button → hidden <input type="file">
 * → loadImageFile() → view flips to 'editor' → useImageCanvas draws it.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import './styles/tokens.css';
import './App.css';

import useEditorStore, { PANELS } from './store/editorStore';
import useImageCanvas             from './hooks/useFabricCanvas';

// ─────────────────────────────────────────────────────────────────
//  SVG ICONS  (all inline — zero external dependencies)
// ─────────────────────────────────────────────────────────────────

const Ico = ({ d, size = 40, stroke = 'currentColor', fill = 'none', strokeWidth = 1.6, ...props }) => (
  <svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {d}
  </svg>
);

// Home screen icons (drawn to match the flat outlined style in screenshot)
const IcoGallery = () => (
  <Ico d={<>
    <rect x="5" y="9" width="30" height="22" rx="2"/>
    <polyline points="5,25 12,17 19,23 25,16 35,25"/>
    <circle cx="13" cy="16" r="2.5"/>
  </>} />
);

const IcoGalleryApps = () => (
  <Ico d={<>
    <rect x="5" y="5" width="30" height="30" rx="2"/>
    <line x1="20" y1="5" x2="20" y2="35"/>
    <line x1="5" y1="20" x2="35" y2="20"/>
    <text x="10" y="17" fontSize="7" fontFamily="serif" stroke="none" fill="currentColor" fontWeight="bold">A</text>
  </>} />
);

const IcoCamera = () => (
  <Ico d={<>
    <path d="M5 14 Q5 12 7 12 L12 12 L14 8 L26 8 L28 12 L33 12 Q35 12 35 14 L35 30 Q35 32 33 32 L7 32 Q5 32 5 30 Z"/>
    <circle cx="20" cy="21" r="6"/>
    <circle cx="20" cy="21" r="3.5" strokeWidth="1"/>
  </>} />
);

const IcoNew = () => (
  <Ico d={<>
    <path d="M10 5 L25 5 L35 15 L35 35 Q35 37 33 37 L7 37 Q5 37 5 35 L5 7 Q5 5 7 5 Z"/>
    <polyline points="25,5 25,15 35,15"/>
    <line x1="20" y1="20" x2="20" y2="30"/>
    <line x1="15" y1="25" x2="25" y2="25"/>
  </>} />
);

const IcoRecent = () => (
  <Ico d={<>
    <circle cx="20" cy="20" r="14"/>
    <polyline points="20,8 20,20 27,27"/>
    <path d="M6 13 A14 14 0 0 0 6 27" strokeDasharray="4 3"/>
    <polyline points="2,13 6,13 6,9"/>
  </>} />
);

const IcoBatch = () => (
  <Ico d={<>
    <rect x="10" y="5"  width="22" height="26" rx="2"/>
    <rect x="6"  y="9"  width="22" height="26" rx="2" strokeDasharray="3 2"/>
    <rect x="2"  y="13" width="22" height="26" rx="2" strokeDasharray="3 2"/>
  </>} />
);

const IcoTools = () => (
  <Ico d={<>
    <circle cx="20" cy="20" r="15"/>
    <line x1="20" y1="5"  x2="20" y2="35"/>
    <path d="M12 10 Q8 14 8 20 Q8 26 12 30" fill="none"/>
    <path d="M28 10 Q32 14 32 20 Q32 26 28 30" fill="none"/>
    <circle cx="20" cy="20" r="4"/>
  </>} />
);

const IcoStar = () => (
  <Ico
    fill="currentColor"
    stroke="none"
    d={<path d="M20 6 L23.5 15 H33.5 L25.9 20.8 L28.8 30 L20 24.5 L11.2 30 L14.1 20.8 L6.5 15 H16.5 Z"/>}
  />
);

const IcoMenu  = () => <Ico size={24} d={<><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="4" y1="20" x2="20" y2="20"/></>} />;
const IcoGrid  = () => <Ico size={24} d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="13" y="3" width="7" height="7" rx="1"/><rect x="3" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></>} />;
const IcoBack  = () => <Ico size={22} d={<polyline points="14 5 7 12 14 19"/>} />;
const IcoUndo  = () => <Ico size={22} d={<><polyline points="7 8 4 11 7 14"/><path d="M4 11 H13 A5 5 0 0 1 18 16 V17"/></>} />;
const IcoRedo  = () => <Ico size={22} d={<><polyline points="15 8 18 11 15 14"/><path d="M18 11 H9 A5 5 0 0 0 4 16 V17"/></>} />;
const IcoSave  = () => <Ico size={22} d={<><path d="M4 4 L16 4 L18 6 L18 18 L4 18 Z"/><rect x="7" y="13" width="7" height="5"/><rect x="7" y="4"  width="6" height="4"/></>} />;
const IcoCheck = () => <Ico size={22} d={<polyline points="4 11 9 16 18 6"/>} />;

// ─────────────────────────────────────────────────────────────────
//  HOME DASHBOARD SCREEN
// ─────────────────────────────────────────────────────────────────

/**
 * HomeDashboard — matches the reference screenshot exactly:
 *   Row 1: Gallery | Gallery Apps | Camera
 *   Row 2: New     | Recent Photos| Batch
 *   Row 3: Tools   | Rate Photo Editor
 *
 * Gallery is the only wired button in Build 1. The rest show a
 * "coming soon" toast in the console (easily wired later).
 */
function HomeDashboard({ onGalleryClick }) {
  const items = [
    // row 1
    { id: 'gallery',  label: 'Gallery',          Icon: IcoGallery,    onClick: onGalleryClick, primary: true },
    { id: 'gapps',    label: 'Gallery Apps',      Icon: IcoGalleryApps },
    { id: 'camera',   label: 'Camera',            Icon: IcoCamera      },
    // row 2
    { id: 'new',      label: 'New',               Icon: IcoNew         },
    { id: 'recent',   label: 'Recent Photos',     Icon: IcoRecent      },
    { id: 'batch',    label: 'Batch',             Icon: IcoBatch       },
    // row 3 (spans differently — 2 cols centred, see CSS)
    { id: 'tools',    label: 'Tools',             Icon: IcoTools       },
    { id: 'rate',     label: 'Rate Photo Editor', Icon: IcoStar        },
  ];

  return (
    <div className="home">
      {/* Top bar */}
      <header className="home__topbar">
        <button className="home__icon-btn" aria-label="Menu"><IcoMenu /></button>
        <h1 className="home__title">Photo Editor</h1>
        <button className="home__icon-btn" aria-label="Grid view"><IcoGrid /></button>
      </header>

      {/* Icon grid */}
      <main className="home__grid" role="main">
        {items.map(({ id, label, Icon, onClick, primary }) => (
          <button
            key={id}
            className={`home__item ${primary ? 'home__item--primary' : ''}`}
            onClick={onClick ?? (() => console.log(`[TODO] ${label}`))}
            aria-label={label}
          >
            <span className="home__item-icon"><Icon /></span>
            <span className="home__item-label">{label}</span>
          </button>
        ))}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TOOL GRID (used inside the editor side panel / bottom sheet)
// ─────────────────────────────────────────────────────────────────

const ALL_TOOLS = [
  { id: PANELS.COLOR,       label: 'Color'        },
  { id: PANELS.CURVES,      label: 'Curves'       },
  { id: PANELS.LEVELS,      label: 'Levels'       },
  { id: PANELS.EFFECT,      label: 'Effect'       },
  { id: PANELS.EFFECT_II,   label: 'Effect II'    },
  { id: PANELS.FRAME,       label: 'Frame'        },
  { id: PANELS.CORRECTION,  label: 'Correction'   },
  { id: PANELS.DENOISE,     label: 'Denoise'      },
  { id: PANELS.DRAWING,     label: 'Drawing'      },
  { id: PANELS.PIXEL,       label: 'Pixel'        },
  { id: PANELS.CLONE,       label: 'Clone'        },
  { id: PANELS.CUT_OUT,     label: 'Cut Out'      },
  { id: PANELS.TEXT_SHAPE,  label: 'Text/Image'   },
  { id: PANELS.ROTATION,    label: 'Rotation'     },
  { id: PANELS.STRAIGHTEN,  label: 'Straighten'   },
  { id: PANELS.CROP,        label: 'Crop'         },
  { id: PANELS.CROP_FREE,   label: 'Crop Free'    },
  { id: PANELS.RESIZE,      label: 'Resize'       },
  { id: PANELS.FIT,         label: 'Fit'          },
  { id: PANELS.PERSPECTIVE, label: 'Perspective'  },
];

function ToolGrid() {
  const { activePanel, setActivePanel } = useEditorStore();
  return (
    <nav className="tool-grid" aria-label="Editing tools">
      {ALL_TOOLS.map(({ id, label }) => (
        <button
          key={id}
          className={`tool-grid__btn ${activePanel === id ? 'tool-grid__btn--active' : ''}`}
          onClick={() => setActivePanel(id)}
          aria-pressed={activePanel === id}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────
//  EDITOR WORKSPACE SCREEN
// ─────────────────────────────────────────────────────────────────

// Shared canvas ref — EditorWorkspace writes it; CanvasViewport reads it.
// This lets the Save button reach the canvas without prop-drilling.
const sharedCanvasRef     = { current: null };
const sharedContainerRef  = { current: null };
let   sharedExportDataURL = () => null;

function EditorWorkspace({ onOpenFile }) {
  const {
    currentImage, activePanel, undoStack, redoStack,
    undo, redo, goHome, closePanel, setActivePanel,
  } = useEditorStore();

  const hasUndo = undoStack.length > 0;
  const hasRedo = redoStack.length > 0;

  // Derive a short display name for the topbar
  const shortName = currentImage?.fileName
    ? currentImage.fileName.replace(/\.[^/.]+$/, '').slice(0, 22)
    : 'untitled';

  const dimText = currentImage
    ? `${currentImage.width} × ${currentImage.height}`
    : '';

  // Export / save — delegates to the shared exportDataURL set by CanvasViewport
  const handleSave = useCallback(() => {
    const url = sharedExportDataURL('image/jpeg', 0.92);
    if (!url) return;
    const a = document.createElement('a');
    a.href     = url;
    a.download = `${shortName}_edited.jpg`;
    a.click();
  }, [shortName]);

  // File re-open inside editor
  const fileInputRef = useRef(null);
  const { loadImageFile } = useEditorStore();

  return (
    <div className="editor">

      {/* ── Top bar ── */}
      <header className="editor__topbar">
        {/* Left: back → home */}
        <button
          className="editor__bar-btn"
          onClick={goHome}
          aria-label="Back to home"
        >
          <IcoBack />
        </button>

        {/* Title block */}
        <div className="editor__title-block">
          <span className="editor__filename">{shortName}</span>
          {dimText && <span className="editor__dims">{dimText}</span>}
        </div>

        {/* Right cluster */}
        <div className="editor__bar-right">
          <button
            className={`editor__bar-btn ${!hasUndo ? 'editor__bar-btn--dim' : ''}`}
            onClick={undo}
            disabled={!hasUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <IcoUndo />
          </button>

          <button
            className={`editor__bar-btn ${!hasRedo ? 'editor__bar-btn--dim' : ''}`}
            onClick={redo}
            disabled={!hasRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
          >
            <IcoRedo />
          </button>

          {activePanel !== PANELS.NONE && (
            <button
              className="editor__bar-btn editor__bar-btn--check"
              onClick={closePanel}
              aria-label="Apply and close panel"
            >
              <IcoCheck />
            </button>
          )}

          <button
            className="editor__bar-btn editor__bar-btn--save"
            onClick={handleSave}
            aria-label="Save / download"
          >
            <IcoSave />
          </button>

          {/* Re-open file */}
          <button
            className="editor__bar-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Open another image"
          >
            <IcoGallery />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadImageFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="editor__body">

        {/* Side panel — desktop landscape only */}
        <aside className="editor__side">
          <ToolGrid />
          {/* Active panel detail area would mount here — Build 2 */}
        </aside>

        {/* Canvas viewport */}
        <CanvasViewport />

      </div>

      {/* ── Bottom bar (mobile) ── */}
      <footer className="editor__bottombar">
        {/* Horizontal scrolling shortcut strip */}
        <div className="editor__tool-strip">
          {ALL_TOOLS.slice(0, 10).map(({ id, label }) => (
            <button
              key={id}
              className={`editor__strip-btn ${activePanel === id ? 'editor__strip-btn--active' : ''}`}
              onClick={() => setActivePanel(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </footer>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  CANVAS VIEWPORT  — the checkerboard + actual <canvas>
// ─────────────────────────────────────────────────────────────────

/**
 * CanvasViewport
 * Renders:
 *   1. A container div sized to fill all available space.
 *   2. A checkerboard background div (always visible beneath canvas).
 *   3. A <canvas> element that useImageCanvas writes into.
 *   4. A drag-and-drop overlay that lights up when you hover a file.
 *
 * The canvas background is set to transparent via CSS so the
 * checkerboard shows through wherever there is no image pixel.
 */
function CanvasViewport() {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const { loadImageFile, currentImage } = useEditorStore();

  // Hook wires the canvas to the image store
  const { exportDataURL } = useImageCanvas(canvasRef, containerRef);

  // Register into module-level ref so EditorWorkspace.handleSave can reach it
  useEffect(() => {
    sharedExportDataURL = exportDataURL;
  }, [exportDataURL]);

  // Drag-and-drop
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadImageFile(file);
  };

  // Empty state message
  const isEmpty = !currentImage;

  return (
    <div
      className={`canvas-viewport ${dragging ? 'canvas-viewport--drag' : ''}`}
      ref={containerRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label="Image canvas area"
    >
      {/* Layer 1: Checkerboard — always rendered */}
      <div className="canvas-viewport__checker checkerboard" aria-hidden="true" />

      {/* Layer 2: Actual <canvas> — transparent background */}
      <canvas
        ref={canvasRef}
        className="canvas-viewport__canvas"
        aria-label={currentImage ? `Editing ${currentImage.fileName}` : 'Empty canvas'}
      />

      {/* Layer 3: Empty-state hint (only before any image loads) */}
      {isEmpty && (
        <div className="canvas-viewport__empty" aria-live="polite">
          <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="10" y="16" width="60" height="48" rx="4"/>
            <polyline points="10,48 24,34 36,44 50,30 70,48"/>
            <circle cx="28" cy="30" r="5"/>
          </svg>
          <p>Drop an image here</p>
          <p className="canvas-viewport__empty-sub">or use Gallery to open a file</p>
        </div>
      )}

      {/* Layer 4: Drag-over glow */}
      {dragging && (
        <div className="canvas-viewport__drop-glow" aria-hidden="true">
          <p>Drop to open</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────────────────────────

export default function App() {
  const { view, loadImageFile } = useEditorStore();

  // Hidden file input referenced from Home → Gallery button
  const galleryInputRef = useRef(null);

  const handleGalleryClick = () => galleryInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
    e.target.value = '';
  };

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (view !== 'editor') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
      if (e.key === 'Escape') {
        useEditorStore.getState().closePanel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  return (
    <div className="app">

      {/* Hidden file input — shared by Home Gallery and editor re-open */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Screen router */}
      {view === 'home'
        ? <HomeDashboard onGalleryClick={handleGalleryClick} />
        : <EditorWorkspace onOpenFile={handleGalleryClick} />
      }

    </div>
  );
}