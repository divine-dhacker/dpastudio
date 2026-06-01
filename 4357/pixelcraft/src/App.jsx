/**
 * App.jsx  v2.0
 * =====================================================================
 * Root component. Routes between:
 *   view === 'home'    → HomeDashboard  (app launch grid)
 *   view === 'editor'  → EditorWorkspace (canvas + tools)
 *
 * Also owns:
 *  - Session restore on mount (refresh protection)
 *  - Hamburger drawer
 *  - "New Canvas" modal wizard
 *  - Camera capture viewfinder
 *  - Settings panel
 *  - ExportModal
 *  - Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Escape)
 * =====================================================================
 */

import React, {
  useRef, useCallback, useEffect, useState, lazy, Suspense
} from 'react';

import './styles/tokens.css';
import './App.css';

import useEditorStore, { PANELS } from './store/editorStore';
import useImageCanvas              from './hooks/useFabricCanvas';

// ─────────────────────────────────────────────────────────────────────
//  LAZY PANEL IMPORTS  (code-split so the home screen loads instantly)
// ─────────────────────────────────────────────────────────────────────

const ColorPanel      = lazy(() => import('./components/panels/ColorPanel'));
const CurvesPanel     = lazy(() => import('./components/panels/CurvesPanel'));
const LevelsPanel     = lazy(() => import('./components/panels/LevelsPanel'));
const EffectPanel     = lazy(() => import('./components/panels/EffectPanel'));
const RotationPanel   = lazy(() => import('./components/panels/RotationPanel'));
const CropPanel       = lazy(() => import('./components/panels/CropPanel'));
const ResizePanel     = lazy(() => import('./components/panels/ResizePanel'));
const PerspectivePanel= lazy(() => import('./components/panels/PerspectivePanel'));
const TextShapePanel  = lazy(() => import('./components/panels/TextShapePanel'));
const FramePanel      = lazy(() => import('./components/panels/FramePanel'));
const ExportModal     = lazy(() => import('./components/modals/ExportModal'));

// ─────────────────────────────────────────────────────────────────────
//  SVG ICON LIBRARY  (100% inline — zero external dependencies)
// ─────────────────────────────────────────────────────────────────────

const Ico = ({
  d, size = 24, stroke = 'currentColor', fill = 'none',
  sw = 1.8, vb = '0 0 24 24', ...props
}) => (
  <svg viewBox={vb} width={size} height={size} fill={fill}
    stroke={stroke} strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" {...props}>
    {d}
  </svg>
);

/* Home grid icons */
const IcoGallery    = () => <Ico size={36} vb="0 0 40 40" sw={1.4}
  d={<><rect x="4" y="8" width="32" height="24" rx="2.5"/>
      <polyline points="4,24 13,15 21,22 28,14 36,24"/>
      <circle cx="14" cy="15" r="3"/></>} />;

const IcoCamera     = () => <Ico size={36} vb="0 0 40 40" sw={1.4}
  d={<><path d="M5 13 Q5 11 7 11 L12 11 L14 7 L26 7 L28 11 L33 11 Q35 11 35 13 L35 31 Q35 33 33 33 L7 33 Q5 33 5 31Z"/>
      <circle cx="20" cy="22" r="6.5"/><circle cx="20" cy="22" r="4" sw={1}/></>} />;

const IcoNew        = () => <Ico size={36} vb="0 0 40 40" sw={1.4}
  d={<><path d="M9 5 L24 5 L35 16 L35 36 Q35 37 33 37 L7 37 Q5 37 5 35 L5 7 Q5 5 7 5Z"/>
      <polyline points="24,5 24,16 35,16"/>
      <line x1="20" y1="21" x2="20" y2="31"/><line x1="15" y1="26" x2="25" y2="26"/></>} />;

const IcoRecent     = () => <Ico size={36} vb="0 0 40 40" sw={1.4}
  d={<><circle cx="20" cy="20" r="14"/>
      <polyline points="20,9 20,20 27,26"/>
      <path d="M7 14 A14 14 0 0 0 7 26" strokeDasharray="3 2"/>
      <polyline points="3,13 7,13 7,9"/></>} />;

const IcoBatch      = () => <Ico size={36} vb="0 0 40 40" sw={1.4}
  d={<><rect x="12" y="4"  width="22" height="26" rx="2"/>
      <rect x="7"  y="9"  width="22" height="26" rx="2" strokeDasharray="3 2"/>
      <rect x="2"  y="14" width="22" height="26" rx="2" strokeDasharray="3 2"/></>} />;

const IcoTools      = () => <Ico size={36} vb="0 0 40 40" sw={1.4}
  d={<><path d="M8 32 L20 12 M20 12 L32 32"/>
      <circle cx="20" cy="20" r="12"/>
      <circle cx="20" cy="20" r="5"/></>} />;

const IcoStar       = () => <Ico size={36} vb="0 0 40 40" fill="currentColor" stroke="none"
  d={<path d="M20 5 L24 15.5 H35.5 L26.5 22 L30 32.5 L20 26 L10 32.5 L13.5 22 L4.5 15.5 H16 Z"/>}/>;

/* Editor UI icons */
const IcoMenu       = () => <Ico d={<><line x1="3" y1="6"  x2="21" y2="6"/>
  <line x1="3" y1="12" x2="21" y2="12"/>
  <line x1="3" y1="18" x2="21" y2="18"/></>} />;

const IcoBack       = () => <Ico d={<polyline points="15 18 9 12 15 6"/>} />;
const IcoUndo       = () => <Ico d={<><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a7 7 0 0 0-7-7H4"/></>} />;
const IcoRedo       = () => <Ico d={<><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a7 7 0 0 1 7-7h9"/></>} />;
const IcoCheck      = () => <Ico sw={2.5} d={<polyline points="20 6 9 17 4 12"/>}/>;
const IcoDownload   = () => <Ico d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />;
const IcoClose      = () => <Ico d={<><line x1="18" y1="6"  x2="6"  y2="18"/>
  <line x1="6"  y1="6"  x2="18" y2="18"/></>} />;
const IcoExpand     = () => <Ico d={<><polyline points="15 3 21 3 21 9"/>
  <polyline points="9 21 3 21 3 15"/>
  <line x1="21" y1="3" x2="14" y2="10"/>
  <line x1="3" y1="21" x2="10" y2="14"/></>} />;
const IcoGrid       = () => <Ico d={<><rect x="3" y="3" width="7" height="7" rx="1"/>
  <rect x="14" y="3" width="7" height="7" rx="1"/>
  <rect x="3" y="14" width="7" height="7" rx="1"/>
  <rect x="14" y="14" width="7" height="7" rx="1"/></>} />;
const IcoSettings   = () => <Ico d={<><circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />;

const IcoInfo       = () => <Ico d={<><circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/></>} />;

const IcoContact    = () => <Ico d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
  <polyline points="22,6 12,13 2,6"/></>} />;

const IcoStar2      = () => <Ico d={<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}/>;

// ─────────────────────────────────────────────────────────────────────
//  ALL TOOLS  (used in ToolGrid + bottom strip)
// ─────────────────────────────────────────────────────────────────────

const ALL_TOOLS = [
  { id: PANELS.COLOR,       label: 'Color'       },
  { id: PANELS.CURVES,      label: 'Curves'      },
  { id: PANELS.LEVELS,      label: 'Levels'      },
  { id: PANELS.EFFECT,      label: 'Effect'      },
  { id: PANELS.EFFECT_II,   label: 'Effect II'   },
  { id: PANELS.FRAME,       label: 'Frame'       },
  { id: PANELS.CORRECTION,  label: 'Correction'  },
  { id: PANELS.DENOISE,     label: 'Denoise'     },
  { id: PANELS.DRAWING,     label: 'Drawing'     },
  { id: PANELS.PIXEL,       label: 'Pixel'       },
  { id: PANELS.CLONE,       label: 'Clone'       },
  { id: PANELS.CUT_OUT,     label: 'Cut Out'     },
  { id: PANELS.TEXT_SHAPE,  label: 'Text/Image'  },
  { id: PANELS.ROTATION,    label: 'Rotation'    },
  { id: PANELS.STRAIGHTEN,  label: 'Straighten'  },
  { id: PANELS.CROP,        label: 'Crop'        },
  { id: PANELS.CROP_FREE,   label: 'Crop Free'   },
  { id: PANELS.RESIZE,      label: 'Resize'      },
  { id: PANELS.FIT,         label: 'Fit'         },
  { id: PANELS.PERSPECTIVE, label: 'Perspective' },
];

// ─────────────────────────────────────────────────────────────────────
//  PANEL COMPONENT MAP
// ─────────────────────────────────────────────────────────────────────

function ActivePanelContent({ histogramData }) {
  const { activePanel } = useEditorStore();

  if (activePanel === PANELS.NONE) return null;

  return (
    <Suspense fallback={<div className="panel-loading">Loading…</div>}>
      {activePanel === PANELS.COLOR       && <ColorPanel />}
      {activePanel === PANELS.CURVES      && <CurvesPanel histogramData={histogramData} />}
      {activePanel === PANELS.LEVELS      && <LevelsPanel histogramData={histogramData} />}
      {activePanel === PANELS.EFFECT      && <EffectPanel />}
      {activePanel === PANELS.EFFECT_II   && <EffectPanel variant="ii" />}
      {activePanel === PANELS.FRAME       && <FramePanel />}
      {activePanel === PANELS.ROTATION    && <RotationPanel />}
      {activePanel === PANELS.STRAIGHTEN  && <RotationPanel straightenMode />}
      {activePanel === PANELS.CROP        && <CropPanel />}
      {activePanel === PANELS.CROP_FREE   && <CropPanel freeMode />}
      {activePanel === PANELS.RESIZE      && <ResizePanel />}
      {activePanel === PANELS.PERSPECTIVE && <PerspectivePanel />}
      {activePanel === PANELS.CORRECTION  && <PerspectivePanel correctionMode />}
      {activePanel === PANELS.TEXT_SHAPE  && <TextShapePanel />}
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  HAMBURGER DRAWER
// ─────────────────────────────────────────────────────────────────────

function HamburgerDrawer({ onClose }) {
  const { setShowSettings } = useEditorStore();

  const items = [
    { icon: <IcoSettings />, label: 'Settings',
      action: () => { setShowSettings(true); onClose(); } },
    { icon: <IcoContact  />, label: 'Contact',
      action: () => window.open('mailto:support@pixelcraft.app', '_blank') },
    { icon: <IcoStar2    />, label: 'Rate the App',
      action: () => console.log('[TODO] Rate app') },
    { icon: <IcoInfo     />, label: 'About',
      action: () => console.log('[TODO] About') },
  ];

  return (
    <div className="drawer-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="App menu"
      >
        {/* App header */}
        <div className="drawer__header">
          <div className="drawer__logo" aria-label="PixelCraft logo">
            <svg viewBox="0 0 40 40" width="36" height="36" fill="none">
              <rect width="40" height="40" rx="10" fill="#1a73e8"/>
              <path d="M10 28 L20 10 L30 28" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
            </svg>
          </div>
          <div className="drawer__app-title">
            <span className="drawer__app-name">Photo Editor</span>
            <span className="drawer__app-sub">PixelCraft</span>
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="Close menu">
            <IcoClose />
          </button>
        </div>

        {/* Menu items */}
        <nav className="drawer__nav">
          {items.map(({ icon, label, action }) => (
            <button key={label} className="drawer__item" onClick={action}>
              <span className="drawer__item-icon">{icon}</span>
              <span className="drawer__item-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* Version footer */}
        <div className="drawer__footer">
          <span>PixelCraft v2.0</span>
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  NEW CANVAS MODAL
// ─────────────────────────────────────────────────────────────────────

const UNIT_FACTORS = { px: 1, in: 96, mm: 3.7795, cm: 37.795, m: 3779.5 };
const DPI_PRESETS  = [72, 96, 150, 300, 600];

function NewCanvasModal({ onClose }) {
  const { createNewCanvas } = useEditorStore();
  const [width,   setWidth]   = useState(1080);
  const [height,  setHeight]  = useState(1080);
  const [unit,    setUnit]    = useState('px');
  const [dpi,     setDpi]     = useState(96);
  const [name,    setName]    = useState('untitled');
  const [bgColor, setBgColor] = useState('#ffffff');

  const handleCreate = () => {
    const factor = UNIT_FACTORS[unit] || 1;
    const pxW    = Math.round(width  * factor);
    const pxH    = Math.round(height * factor);
    if (pxW < 1 || pxH < 1 || pxW > 16384 || pxH > 16384) {
      alert('Canvas dimensions out of range (1–16384 px per side).');
      return;
    }
    createNewCanvas({ width: pxW, height: pxH, fileName: `${name}.png`, backgroundColor: bgColor });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal new-canvas-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2 className="modal__title">New Canvas</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close"><IcoClose /></button>
        </header>

        <div className="modal__body">
          {/* Dimensions row */}
          <div className="ncm__row">
            <label className="ncm__label">Width</label>
            <input className="ncm__num-input" type="number" min="1" max="16384"
              value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            <span className="ncm__sep">×</span>
            <input className="ncm__num-input" type="number" min="1" max="16384"
              value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            <label className="ncm__label">H</label>
          </div>

          {/* Unit selector */}
          <div className="ncm__row">
            <label className="ncm__label">Unit</label>
            <div className="ncm__unit-btns">
              {Object.keys(UNIT_FACTORS).map((u) => (
                <button key={u}
                  className={`ncm__unit-btn ${unit === u ? 'active' : ''}`}
                  onClick={() => setUnit(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* DPI */}
          <div className="ncm__row">
            <label className="ncm__label">Density</label>
            <select className="ncm__select"
              value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
              {DPI_PRESETS.map((d) => (
                <option key={d} value={d}>{d} px/in</option>
              ))}
            </select>
          </div>

          {/* File name */}
          <div className="ncm__row">
            <label className="ncm__label">Name</label>
            <input className="ncm__text-input" type="text"
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="untitled" />
          </div>

          {/* Background */}
          <div className="ncm__row">
            <label className="ncm__label">Background</label>
            <div className="ncm__bg-row">
              <input className="ncm__color-picker" type="color"
                value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              <span className="ncm__color-value">{bgColor.toUpperCase()}</span>
              <button className="ncm__transparent-btn"
                onClick={() => setBgColor('transparent')}>
                Transparent
              </button>
            </div>
          </div>

          {/* Preview dims */}
          <p className="ncm__preview-dims">
            {Math.round(width * (UNIT_FACTORS[unit] || 1))} ×{' '}
            {Math.round(height * (UNIT_FACTORS[unit] || 1))} px at {dpi} dpi
          </p>
        </div>

        <footer className="modal__footer">
          <button className="modal__btn modal__btn--cancel" onClick={onClose}>Cancel</button>
          <button className="modal__btn modal__btn--ok" onClick={handleCreate}>OK</button>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  CAMERA MODAL
// ─────────────────────────────────────────────────────────────────────

function CameraModal({ onClose }) {
  const { loadFromDataURL } = useEditorStore();
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch((err) => {
        if (mounted) setError(`Camera unavailable: ${err.message}`);
      });

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;

    const oc  = document.createElement('canvas');
    oc.width  = video.videoWidth;
    oc.height = video.videoHeight;
    oc.getContext('2d').drawImage(video, 0, 0);

    const dataURL = oc.toDataURL('image/jpeg', 0.92);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    loadFromDataURL(dataURL, {
      fileName: `camera_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      width:    oc.width,
      height:   oc.height,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop camera-backdrop" role="dialog" aria-modal="true">
      <div className="modal camera-modal">
        <header className="modal__header">
          <h2 className="modal__title">Camera</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close"><IcoClose /></button>
        </header>

        <div className="camera-modal__viewfinder">
          {error ? (
            <div className="camera-modal__error">{error}</div>
          ) : (
            <video
              ref={videoRef}
              className="camera-modal__video"
              autoPlay
              playsInline
              muted
            />
          )}
          {/* Viewfinder reticle overlay */}
          {!error && (
            <div className="camera-modal__reticle" aria-hidden="true">
              <div className="camera-modal__corner tl"/>
              <div className="camera-modal__corner tr"/>
              <div className="camera-modal__corner bl"/>
              <div className="camera-modal__corner br"/>
            </div>
          )}
        </div>

        <footer className="camera-modal__footer">
          <button className="camera-modal__shutter" onClick={capture}
            disabled={!ready || !!error} aria-label="Capture photo">
            <span className="camera-modal__shutter-ring"/>
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }) {
  const { clearSession } = useEditorStore.getState ? {} : {};
  const [maxExport, setMaxExport]   = useState(16);
  const [autoSave,  setAutoSave]    = useState(true);
  const [undoLimit, setUndoLimit]   = useState(30);

  const handleClearCache = () => {
    sessionStorage.clear();
    alert('Cache cleared. Reload to apply.');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2 className="modal__title">Settings</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close"><IcoClose /></button>
        </header>

        <div className="modal__body settings-body">
          <div className="settings__section-label">Export</div>
          <div className="settings__row">
            <span>Max Export Size</span>
            <select className="ncm__select" value={maxExport}
              onChange={(e) => setMaxExport(Number(e.target.value))}>
              {[8,12,16,24,32].map((v) => (
                <option key={v} value={v}>{v} MP</option>
              ))}
            </select>
          </div>

          <div className="settings__section-label">History</div>
          <div className="settings__row">
            <span>Undo limit</span>
            <select className="ncm__select" value={undoLimit}
              onChange={(e) => setUndoLimit(Number(e.target.value))}>
              {[10,20,30,50].map((v) => (
                <option key={v} value={v}>{v} steps</option>
              ))}
            </select>
          </div>

          <div className="settings__section-label">Session</div>
          <div className="settings__row">
            <span>Auto-restore on refresh</span>
            <button
              className={`settings__toggle ${autoSave ? 'on' : 'off'}`}
              onClick={() => setAutoSave((v) => !v)}
              aria-pressed={autoSave}>
              {autoSave ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings__row">
            <span>Clear session cache</span>
            <button className="settings__danger-btn" onClick={handleClearCache}>
              Clear
            </button>
          </div>

          <div className="settings__section-label">About</div>
          <p className="settings__about-text">
            PixelCraft v2.0 — A production-grade web photo editor.<br/>
            Client-side only. Your images never leave your device.
          </p>
        </div>

        <footer className="modal__footer">
          <button className="modal__btn modal__btn--ok" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  HOME DASHBOARD
// ─────────────────────────────────────────────────────────────────────

function HomeDashboard({ onGallery, onCamera, onNew }) {
  const { setShowDrawer } = useEditorStore();

  const items = [
    { id: 'gallery',  label: 'Gallery',          Icon: IcoGallery,  onClick: onGallery,  primary: true },
    { id: 'camera',   label: 'Camera',            Icon: IcoCamera,   onClick: onCamera    },
    { id: 'new',      label: 'New',               Icon: IcoNew,      onClick: onNew       },
    { id: 'recent',   label: 'Recent Photos',     Icon: IcoRecent,   onClick: () => console.log('[TODO] Recent') },
    { id: 'batch',    label: 'Batch',             Icon: IcoBatch,    onClick: () => console.log('[TODO] Batch') },
    { id: 'tools',    label: 'Tools',             Icon: IcoTools,    onClick: () => console.log('[TODO] Tools') },
    { id: 'rate',     label: 'Rate App',          Icon: IcoStar,     onClick: () => console.log('[TODO] Rate') },
  ];

  return (
    <div className="home">
      {/* Top bar */}
      <header className="home__topbar">
        <button className="home__icon-btn" aria-label="Open menu"
          onClick={() => setShowDrawer(true)}>
          <IcoMenu />
        </button>
        <h1 className="home__title">Photo Editor</h1>
        <button className="home__icon-btn" aria-label="Grid view">
          <IcoGrid />
        </button>
      </header>

      {/* Icon grid */}
      <main className="home__grid" role="main">
        {items.map(({ id, label, Icon, onClick, primary }) => (
          <button
            key={id}
            className={`home__item ${primary ? 'home__item--primary' : ''}`}
            onClick={onClick}
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

// ─────────────────────────────────────────────────────────────────────
//  CANVAS VIEWPORT
// ─────────────────────────────────────────────────────────────────────

/**
 * Shared refs — CanvasViewport writes them, EditorWorkspace's save
 * handler reads exportDataURL without needing prop drilling.
 */
const _sharedExportDataURL = { fn: null };
const _sharedGetHistogram  = { fn: null };
const _sharedRedraw        = { fn: null };

function CanvasViewport({ onHistogramReady }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const { loadImageFile, currentImage } = useEditorStore();

  const { exportDataURL, getHistogramData, redraw } = useImageCanvas(canvasRef, containerRef);

  /* Register into module-level refs */
  useEffect(() => {
    _sharedExportDataURL.fn = exportDataURL;
    _sharedGetHistogram.fn  = getHistogramData;
    _sharedRedraw.fn        = redraw;
  }, [exportDataURL, getHistogramData, redraw]);

  /* Bubble histogram up when image loads or changes */
  useEffect(() => {
    if (!currentImage) return;
    const timer = setTimeout(() => {
      const data = getHistogramData();
      if (data && onHistogramReady) onHistogramReady(data);
    }, 200);
    return () => clearTimeout(timer);
  }, [currentImage, getHistogramData, onHistogramReady]);

  /* Drag-and-drop */
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadImageFile(file);
  };

  const isEmpty = !currentImage;

  return (
    <div
      ref={containerRef}
      className={[
        'canvas-viewport',
        isEmpty ? '' : 'canvas-viewport--loaded',
        dragging ? 'canvas-viewport--drag' : '',
      ].join(' ').trim()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label="Image canvas area"
    >
      {/* Layer 0 — checkerboard ONLY when no image */}
      {isEmpty && (
        <div className="canvas-viewport__checker checkerboard" aria-hidden="true" />
      )}

      {/* Layer 1 — actual canvas */}
      <canvas
        ref={canvasRef}
        className="canvas-viewport__canvas"
        aria-label={currentImage ? `Editing ${currentImage.fileName}` : 'Empty canvas'}
      />

      {/* Layer 2 — empty state hint */}
      {isEmpty && (
        <div className="canvas-viewport__empty" aria-live="polite">
          <svg viewBox="0 0 80 80" fill="none" stroke="currentColor"
            strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <rect x="8" y="14" width="64" height="52" rx="4"/>
            <polyline points="8,46 23,32 36,43 52,28 72,46"/>
            <circle cx="29" cy="28" r="6"/>
          </svg>
          <p>Drop an image here</p>
          <p className="canvas-viewport__empty-sub">or use Gallery / Camera to open</p>
        </div>
      )}

      {/* Layer 3 — drag-over glow */}
      {dragging && (
        <div className="canvas-viewport__drop-glow" aria-hidden="true">
          <p>Drop to open</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  EDITOR WORKSPACE
// ─────────────────────────────────────────────────────────────────────

function EditorWorkspace({ onOpenFile }) {
  const {
    currentImage, activePanel, undoStack, redoStack,
    undo, redo, goHome, closePanel, setActivePanel,
    showExportModal, setShowExportModal, zoom, setZoom,
  } = useEditorStore();

  const fileInputRef  = useRef(null);
  const [histData, setHistData] = useState(null);

  const hasUndo = undoStack.length > 0;
  const hasRedo = redoStack.length > 0;

  const { loadImageFile } = useEditorStore();

  const handleSave = useCallback(() => {
    const dataURL = _sharedExportDataURL.fn?.('image/jpeg', 0.92);
    if (!dataURL) return;
    const link    = document.createElement('a');
    link.download = (currentImage?.fileName ?? 'export') + '.jpg';
    link.href     = dataURL;
    link.click();
  }, [currentImage]);

  const handleExport = useCallback(({ format, quality }) => {
    const mime    = `image/${format === 'jpeg' ? 'jpeg' : format}`;
    const dataURL = _sharedExportDataURL.fn?.(mime, quality);
    if (!dataURL) return;
    const link    = document.createElement('a');
    link.download = (currentImage?.fileName ?? 'export').replace(/\.[^.]+$/, '') + `.${format}`;
    link.href     = dataURL;
    link.click();
  }, [currentImage]);

  return (
    <div className="editor">

      {/* ── Top bar ── */}
      <header className="editor__topbar">
        {/* Back */}
        <button className="editor__bar-btn editor__bar-btn--touch"
          onClick={goHome} aria-label="Back to home">
          <IcoBack />
        </button>

        {/* File info */}
        <div className="editor__title-block">
          <span className="editor__filename">
            {currentImage?.fileName ?? 'untitled'}
          </span>
          {currentImage && (
            <span className="editor__dims" aria-label="Image dimensions">
              {currentImage.width} × {currentImage.height} px
              {currentImage.megapixels && ` · ${currentImage.megapixels} MP`}
            </span>
          )}
        </div>

        {/* Right cluster */}
        <div className="editor__bar-right">
          {/* Zoom selector */}
          <select
            className="editor__zoom-select"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom level"
          >
            {[10, 25, 50, 75, 100, 150, 200, 300, 400].map((z) => (
              <option key={z} value={z}>{z}%</option>
            ))}
          </select>

          {/* Undo */}
          <button
            className={`editor__bar-btn ${!hasUndo ? 'editor__bar-btn--dim' : ''}`}
            onClick={() => { const url = undo(); if (url) _sharedRedraw.fn?.(); }}
            disabled={!hasUndo}
            aria-label={`Undo (${undoStack.length})`}
          >
            <IcoUndo />
            {hasUndo && <span className="editor__stack-count">{undoStack.length}</span>}
          </button>

          {/* Redo */}
          <button
            className={`editor__bar-btn ${!hasRedo ? 'editor__bar-btn--dim' : ''}`}
            onClick={() => { const url = redo(); if (url) _sharedRedraw.fn?.(); }}
            disabled={!hasRedo}
            aria-label={`Redo (${redoStack.length})`}
          >
            <IcoRedo />
            {hasRedo && <span className="editor__stack-count">{redoStack.length}</span>}
          </button>

          {/* Apply / confirm panel — only visible when a panel is active */}
          {activePanel !== PANELS.NONE && (
            <button
              className="editor__bar-btn editor__bar-btn--check editor__bar-btn--touch"
              onClick={closePanel}
              aria-label="Apply and close panel"
            >
              <IcoCheck />
            </button>
          )}

          {/* Download / save — always accessible, big touch target */}
          <button
            className="editor__bar-btn editor__bar-btn--save editor__bar-btn--touch"
            onClick={() => setShowExportModal(true)}
            aria-label="Export / download"
          >
            <IcoDownload />
          </button>

          {/* Re-open file */}
          <button
            className="editor__bar-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Open another image"
          >
            <IcoGrid />
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

        {/* Left panel — desktop/landscape only */}
        <aside className="editor__side carbon-bg">
          {/* Tool grid */}
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
        </aside>

        {/* Canvas viewport — centre */}
        <CanvasViewport onHistogramReady={setHistData} />

        {/* Right panel — active tool detail (desktop) */}
        {activePanel !== PANELS.NONE && (
          <aside className="editor__panel carbon-bg">
            <div className="editor__panel-header">
              <span className="editor__panel-title">
                {ALL_TOOLS.find((t) => t.id === activePanel)?.label ?? ''}
              </span>
              <button className="editor__bar-btn" onClick={closePanel} aria-label="Close panel">
                <IcoClose />
              </button>
            </div>
            <div className="editor__panel-body">
              <ActivePanelContent histogramData={histData} />
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom bar (mobile portrait) ── */}
      <footer className="editor__bottombar">
        {/* Tool shortcut strip */}
        <div className="editor__tool-strip" role="list">
          {ALL_TOOLS.map(({ id, label }) => (
            <button
              key={id}
              role="listitem"
              className={`editor__strip-btn ${activePanel === id ? 'editor__strip-btn--active' : ''}`}
              onClick={() => setActivePanel(id)}
              aria-pressed={activePanel === id}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bottom active panel area — visible on mobile when panel open */}
        {activePanel !== PANELS.NONE && (
          <div className="editor__mobile-panel carbon-bg">
            <div className="editor__panel-header">
              <span className="editor__panel-title">
                {ALL_TOOLS.find((t) => t.id === activePanel)?.label ?? ''}
              </span>
              <button className="editor__bar-btn editor__bar-btn--check"
                onClick={closePanel} aria-label="Apply">
                <IcoCheck />
              </button>
            </div>
            <div className="editor__panel-body">
              <ActivePanelContent histogramData={histData} />
            </div>
          </div>
        )}
      </footer>

      {/* ── Export Modal ── */}
      {showExportModal && (
        <Suspense fallback={null}>
          <ExportModal
            onExport={handleExport}
            onClose={() => setShowExportModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────────────────────────────

export default function App() {
  const {
    view, loadImageFile, restoreSession,
    showDrawer, setShowDrawer,
    showNewModal, setShowNewModal,
    showCameraModal, setShowCameraModal,
    showSettings, setShowSettings,
  } = useEditorStore();

  const galleryInputRef = useRef(null);

  // ── Session restore on first mount ────────────────────────────
  useEffect(() => {
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gallery file input handler ────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
    e.target.value = '';
  };

  const handleGalleryClick = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  // ── Global keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (view !== 'editor') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const url = useEditorStore.getState().undo();
        if (url) _sharedRedraw.fn?.();
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const url = useEditorStore.getState().redo();
        if (url) _sharedRedraw.fn?.();
      }
      if (e.key === 'Escape') {
        useEditorStore.getState().closePanel();
        setShowDrawer(false);
      }
      if (mod && e.key === 's') {
        e.preventDefault();
        useEditorStore.getState().setShowExportModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, setShowDrawer]);

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

      {/* ── Screen router ── */}
      {view === 'home' ? (
        <HomeDashboard
          onGallery={handleGalleryClick}
          onCamera={() => setShowCameraModal(true)}
          onNew={() => setShowNewModal(true)}
        />
      ) : (
        <EditorWorkspace onOpenFile={handleGalleryClick} />
      )}

      {/* ── Global overlays (mounted at root to sit above everything) ── */}

      {showDrawer && (
        <HamburgerDrawer onClose={() => setShowDrawer(false)} />
      )}

      {showNewModal && (
        <NewCanvasModal onClose={() => setShowNewModal(false)} />
      )}

      {showCameraModal && (
        <CameraModal onClose={() => setShowCameraModal(false)} />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
