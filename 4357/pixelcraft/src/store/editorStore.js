/**
 * editorStore.js  v2.0
 * =====================================================================
 * Single source of truth for the entire PixelCraft editor.
 *
 * Screens:
 *   view === 'home'    → Dashboard grid (no project open)
 *   view === 'editor'  → Canvas workspace (project open)
 *
 * Zero Data-Loss Persistence:
 *   On every state mutation that touches the canvas, we serialize a
 *   compact session snapshot to sessionStorage. On first mount, App.jsx
 *   calls restoreSession() which replays that snapshot, restoring the
 *   user's exact editing state after an accidental page refresh.
 *
 * Panel State Map (one slice per tool):
 *   colorAdj, curvesState, levelsState, rotationAdj, cropAdj,
 *   resizeState, effectState, perspectiveState, textShapeState
 *
 * UI State:
 *   view, activePanel, zoom, showExportModal, showDrawer,
 *   showNewModal, showCameraModal, showInfoPanel, showSettings
 * =====================================================================
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────
//  PANEL ID CONSTANTS
// ─────────────────────────────────────────────────────────────────────

export const PANELS = {
  NONE:        'none',
  COLOR:       'color',
  CURVES:      'curves',
  LEVELS:      'levels',
  EFFECT:      'effect',
  EFFECT_II:   'effect_ii',
  FRAME:       'frame',
  CORRECTION:  'correction',
  DENOISE:     'denoise',
  DRAWING:     'drawing',
  PIXEL:       'pixel',
  CLONE:       'clone',
  CUT_OUT:     'cut_out',
  TEXT_SHAPE:  'text_shape',
  ROTATION:    'rotation',
  STRAIGHTEN:  'straighten',
  CROP:        'crop',
  CROP_FREE:   'crop_free',
  RESIZE:      'resize',
  FIT:         'fit',
  PERSPECTIVE: 'perspective',
};

// ─────────────────────────────────────────────────────────────────────
//  SESSION PERSISTENCE HELPERS
// ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'pixelcraft_session_v2';
const MAX_UNDO    = 30;

/**
 * Saves a compact snapshot of recoverable state to sessionStorage.
 * We don't store the objectURL (revocable, can't persist cross-refresh),
 * but we store everything else needed to show "you had an image open".
 */
function saveSession(state) {
  try {
    const snap = {
      view:          state.view,
      activePanel:   state.activePanel,
      zoom:          state.zoom,
      colorAdj:      state.colorAdj,
      rotationAdj:   state.rotationAdj,
      cropAdj:       state.cropAdj,
      resizeState:   state.resizeState,
      effectState:   state.effectState,
      curvesState:   state.curvesState,
      levelsState:   state.levelsState,
      // Minimal image meta — NOT the binary data / objectURL
      imageMeta: state.currentImage
        ? {
            fileName:   state.currentImage.fileName,
            fileSize:   state.currentImage.fileSize,
            mimeType:   state.currentImage.mimeType,
            width:      state.currentImage.width,
            height:     state.currentImage.height,
            megapixels: state.currentImage.megapixels,
          }
        : null,
      // Last canvas dataURL snapshot for restoring the visible image
      // (capped — large images are truncated to save storage)
      canvasSnapshot: state._canvasSnapshot ?? null,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snap));
  } catch (e) {
    // sessionStorage quota exceeded — fail silently
    console.warn('[editorStore] sessionStorage write failed:', e.message);
  }
}

/** Reads the persisted session snapshot (or null if none). */
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Wipes the persisted session (called on goHome or explicit clear). */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ─────────────────────────────────────────────────────────────────────
//  DEFAULT SLICES
// ─────────────────────────────────────────────────────────────────────

const defaultColorAdj = {
  brightness: 0, contrast: 0, saturation: 0,
  warmth: 0,     tint: 0,     vibrance: 0,
  highlights: 0, shadows: 0,  whites: 0,
  blacks: 0,     clarity: 0,  exposure: 0,
};

const defaultCurvesState = {
  channel: 'RGB',
  points: {
    RGB: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    R:   [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    G:   [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    B:   [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  },
};

const defaultLevelsState = {
  channel:    'RGB',
  inputLow:   0,
  inputHigh:  255,
  gamma:      1.0,
  outputLow:  0,
  outputHigh: 255,
};

const defaultRotationAdj = { angle: 0, flipH: false, flipV: false };

const defaultCropAdj = { ratio: 'original' };

const defaultResizeState = { width: 0, height: 0, lockAspect: true };

const defaultEffectState = {
  activeEffect: null,
  shape: 'circle',
  radius: 50,
};

const defaultPerspectiveState = {
  activeCorrection: null,
  corners: [
    { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 },
  ],
};

// ─────────────────────────────────────────────────────────────────────
//  ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────

const useEditorStore = create(
  subscribeWithSelector((set, get) => ({

    // ── View / Screen routing ──────────────────────────────────────
    view:        'home',   // 'home' | 'editor'
    activePanel: PANELS.NONE,

    // ── Loaded project ─────────────────────────────────────────────
    currentImage: null,
    /*  shape: {
          objectURL:  string,   // revokable blob URL
          fileName:   string,
          fileSize:   number,
          mimeType:   string,
          width:      number,
          height:     number,
          megapixels: string,
        }
    */

    // Internal: last canvas dataURL for session restore
    _canvasSnapshot: null,

    // ── Canvas view ─────────────────────────────────────────────────
    zoom: 100,   // 10–400; 100 = "fit to canvas"

    // ── History stacks (dataURL strings) ────────────────────────────
    undoStack: [],
    redoStack: [],

    // ── Tool-panel adjustment states ────────────────────────────────
    colorAdj:         { ...defaultColorAdj },
    curvesState:      { ...defaultCurvesState,
                          points: JSON.parse(JSON.stringify(defaultCurvesState.points)) },
    levelsState:      { ...defaultLevelsState },
    rotationAdj:      { ...defaultRotationAdj },
    cropAdj:          { ...defaultCropAdj },
    resizeState:      { ...defaultResizeState },
    effectState:      { ...defaultEffectState },
    perspectiveState: { ...defaultPerspectiveState },

    // ── UI overlay visibility ────────────────────────────────────────
    showExportModal: false,
    showDrawer:      false,   // hamburger drawer
    showNewModal:    false,   // "New canvas" wizard
    showCameraModal: false,   // camera capture viewfinder
    showInfoPanel:   false,   // image info overlay
    showSettings:    false,   // settings panel

    // ─────────────────────────────────────────────────────────────
    //  SESSION RESTORE
    //  Called once from App.jsx on mount. Re-hydrates from
    //  sessionStorage if the user refreshed mid-session.
    // ─────────────────────────────────────────────────────────────

    restoreSession: () => {
      const snap = loadSession();
      if (!snap) return false;

      // If there was an image, we can restore metadata + canvas snapshot
      // but not the objectURL (revoked on refresh). We signal 'editor'
      // view only if we also have a canvas snapshot to display.
      const hasCanvas = !!snap.canvasSnapshot && !!snap.imageMeta;

      set({
        view:          hasCanvas ? 'editor' : 'home',
        activePanel:   snap.activePanel  ?? PANELS.NONE,
        zoom:          snap.zoom         ?? 100,
        colorAdj:      { ...defaultColorAdj,    ...(snap.colorAdj    ?? {}) },
        rotationAdj:   { ...defaultRotationAdj, ...(snap.rotationAdj ?? {}) },
        cropAdj:       { ...defaultCropAdj,     ...(snap.cropAdj     ?? {}) },
        resizeState:   { ...defaultResizeState,  ...(snap.resizeState ?? {}) },
        effectState:   { ...defaultEffectState,  ...(snap.effectState ?? {}) },
        levelsState:   { ...defaultLevelsState,  ...(snap.levelsState ?? {}) },
        curvesState:   snap.curvesState ?? {
          ...defaultCurvesState,
          points: JSON.parse(JSON.stringify(defaultCurvesState.points)),
        },
        // Restore image meta (without a real objectURL — canvas hook
        // will detect _canvasSnapshot and paint it via a data: URL)
        currentImage:    hasCanvas ? { ...snap.imageMeta, objectURL: snap.canvasSnapshot } : null,
        _canvasSnapshot: snap.canvasSnapshot ?? null,
      });

      return hasCanvas;
    },

    // ─────────────────────────────────────────────────────────────
    //  IMAGE LOADING
    // ─────────────────────────────────────────────────────────────

    /**
     * loadImageFile — wired to <input type="file"> and drag/drop.
     * Reads the file, resolves natural dimensions, transitions to editor.
     */
    loadImageFile: (file) => {
      if (!file || !file.type.startsWith('image/')) return;

      // Revoke previous objectURL to avoid memory leaks
      const prev = get().currentImage;
      if (prev?.objectURL && prev.objectURL.startsWith('blob:')) {
        URL.revokeObjectURL(prev.objectURL);
      }

      const objectURL = URL.createObjectURL(file);

      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const megapixels = ((w * h) / 1_000_000).toFixed(2);

        const imageData = {
          objectURL,
          fileName:   file.name,
          fileSize:   file.size,
          mimeType:   file.type,
          width:      w,
          height:     h,
          megapixels,
        };

        set({
          view:         'editor',
          currentImage: imageData,
          activePanel:  PANELS.NONE,
          undoStack:    [],
          redoStack:    [],
          zoom:         100,
          colorAdj:     { ...defaultColorAdj },
          rotationAdj:  { ...defaultRotationAdj },
          cropAdj:      { ...defaultCropAdj },
          resizeState:  { width: w, height: h, lockAspect: true },
          effectState:  { ...defaultEffectState },
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectURL);
        alert('Could not load that image file. Please try another format.');
      };

      img.src = objectURL;
    },

    /**
     * loadFromDataURL — used for camera capture and session restore.
     */
    loadFromDataURL: (dataURL, meta = {}) => {
      const img = new Image();
      img.onload = () => {
        const w = meta.width  || img.naturalWidth;
        const h = meta.height || img.naturalHeight;

        set({
          view: 'editor',
          currentImage: {
            objectURL:  dataURL,
            fileName:   meta.fileName   || 'captured.jpg',
            fileSize:   meta.fileSize   || 0,
            mimeType:   meta.mimeType   || 'image/jpeg',
            width:      w,
            height:     h,
            megapixels: ((w * h) / 1_000_000).toFixed(2),
          },
          activePanel: PANELS.NONE,
          undoStack:   [],
          redoStack:   [],
          zoom:        100,
          colorAdj:    { ...defaultColorAdj },
          rotationAdj: { ...defaultRotationAdj },
          resizeState: { width: w, height: h, lockAspect: true },
        });
      };
      img.src = dataURL;
    },

    /**
     * createNewCanvas — from "New" wizard. Initializes a blank surface.
     */
    createNewCanvas: ({ width, height, fileName, backgroundColor }) => {
      // We generate a plain colored dataURL to use as the "image"
      const oc = document.createElement('canvas');
      oc.width  = width;
      oc.height = height;
      const ctx = oc.getContext('2d');
      ctx.fillStyle = backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      const dataURL = oc.toDataURL('image/png');

      set({
        view: 'editor',
        currentImage: {
          objectURL:  dataURL,
          fileName:   fileName || 'untitled.png',
          fileSize:   0,
          mimeType:   'image/png',
          width,
          height,
          megapixels: ((width * height) / 1_000_000).toFixed(2),
        },
        activePanel:  PANELS.NONE,
        undoStack:    [],
        redoStack:    [],
        zoom:         100,
        colorAdj:     { ...defaultColorAdj },
        rotationAdj:  { ...defaultRotationAdj },
        resizeState:  { width, height, lockAspect: true },
        showNewModal: false,
      });
    },

    /**
     * goHome — closes editor, clears state, returns to dashboard.
     */
    goHome: () => {
      const prev = get().currentImage;
      if (prev?.objectURL?.startsWith('blob:')) URL.revokeObjectURL(prev.objectURL);
      clearSession();
      set({
        view:            'home',
        currentImage:    null,
        activePanel:     PANELS.NONE,
        undoStack:       [],
        redoStack:       [],
        _canvasSnapshot: null,
        showExportModal: false,
        showDrawer:      false,
        showInfoPanel:   false,
      });
    },

    // ─────────────────────────────────────────────────────────────
    //  PANEL NAVIGATION
    // ─────────────────────────────────────────────────────────────

    setActivePanel: (panelId) => {
      const cur = get().activePanel;
      set({ activePanel: cur === panelId ? PANELS.NONE : panelId });
    },
    closePanel: () => set({ activePanel: PANELS.NONE }),

    // ─────────────────────────────────────────────────────────────
    //  ZOOM
    // ─────────────────────────────────────────────────────────────

    setZoom: (z) => set({ zoom: Math.max(10, Math.min(400, z)) }),
    toggleFitMode: () => set({ zoom: 100 }),

    // ─────────────────────────────────────────────────────────────
    //  UNDO / REDO
    // ─────────────────────────────────────────────────────────────

    /**
     * pushUndo — push current canvas state BEFORE applying a destructive op.
     * @param {string} dataURL  canvas.toDataURL() snapshot
     */
    pushUndo: (dataURL) => {
      set((s) => ({
        undoStack: [dataURL, ...s.undoStack].slice(0, MAX_UNDO),
        redoStack: [],
      }));
    },

    undo: () => {
      const { undoStack, redoStack } = get();
      if (!undoStack.length) return null;
      const [head, ...rest] = undoStack;
      set({ undoStack: rest, redoStack: [head, ...redoStack] });
      return head;
    },

    redo: () => {
      const { undoStack, redoStack } = get();
      if (!redoStack.length) return null;
      const [head, ...rest] = redoStack;
      set({ redoStack: rest, undoStack: [head, ...undoStack] });
      return head;
    },

    // ─────────────────────────────────────────────────────────────
    //  CANVAS SNAPSHOT (for session persistence)
    // ─────────────────────────────────────────────────────────────

    /**
     * Called by useFabricCanvas after every redraw.
     * Stores a (possibly downscaled) dataURL for session recovery.
     */
    setCanvasSnapshot: (dataURL) => {
      set({ _canvasSnapshot: dataURL });
    },

    // ─────────────────────────────────────────────────────────────
    //  ADJUSTMENT SETTERS
    // ─────────────────────────────────────────────────────────────

    updateColorAdj: (patch) =>
      set((s) => ({ colorAdj: { ...s.colorAdj, ...patch } })),

    updateRotationAdj: (patch) =>
      set((s) => ({ rotationAdj: { ...s.rotationAdj, ...patch } })),

    updateCropAdj: (patch) =>
      set((s) => ({ cropAdj: { ...s.cropAdj, ...patch } })),

    updateResizeState: (patch) =>
      set((s) => ({ resizeState: { ...s.resizeState, ...patch } })),

    updateEffectState: (patch) =>
      set((s) => ({ effectState: { ...s.effectState, ...patch } })),

    updateLevelsState: (patch) =>
      set((s) => ({ levelsState: { ...s.levelsState, ...patch } })),

    updatePerspectiveState: (patch) =>
      set((s) => ({ perspectiveState: { ...s.perspectiveState, ...patch } })),

    // Curves: channel switch & point mutation
    setCurvesChannel: (channel) =>
      set((s) => ({ curvesState: { ...s.curvesState, channel } })),

    setCurvesPoints: (channel, points) =>
      set((s) => ({
        curvesState: {
          ...s.curvesState,
          points: { ...s.curvesState.points, [channel]: points },
        },
      })),

    resetCurvesChannel: (channel) =>
      set((s) => ({
        curvesState: {
          ...s.curvesState,
          points: {
            ...s.curvesState.points,
            [channel]: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
          },
        },
      })),

    // ─────────────────────────────────────────────────────────────
    //  UI VISIBILITY TOGGLES
    // ─────────────────────────────────────────────────────────────

    setShowExportModal: (v) => set({ showExportModal: v }),
    setShowDrawer:      (v) => set({ showDrawer: v }),
    setShowNewModal:    (v) => set({ showNewModal: v }),
    setShowCameraModal: (v) => set({ showCameraModal: v }),
    setShowInfoPanel:   (v) => set({ showInfoPanel: v }),
    setShowSettings:    (v) => set({ showSettings: v }),
  }))
);

// ─────────────────────────────────────────────────────────────────────
//  AUTO-PERSIST SUBSCRIPTION
//  Runs after every state change that could affect the session.
//  We throttle writes to avoid hammering sessionStorage on every
//  slider drag tick.
// ─────────────────────────────────────────────────────────────────────

let persistTimer = null;

useEditorStore.subscribe(
  (state) => ({
    view:         state.view,
    activePanel:  state.activePanel,
    zoom:         state.zoom,
    colorAdj:     state.colorAdj,
    rotationAdj:  state.rotationAdj,
    cropAdj:      state.cropAdj,
    resizeState:  state.resizeState,
    effectState:  state.effectState,
    curvesState:  state.curvesState,
    levelsState:  state.levelsState,
    currentImage: state.currentImage,
    _canvasSnapshot: state._canvasSnapshot,
  }),
  (slice) => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => saveSession(useEditorStore.getState()), 400);
  }
);

export default useEditorStore;
