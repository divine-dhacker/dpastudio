/**
 * editorStore.js
 *
 * The single source of truth for the entire editor.
 * Two top-level "screens":
 *   view === 'home'    → Dashboard grid (no image loaded)
 *   view === 'editor'  → Canvas workspace (image loaded)
 *
 * imageData carries the raw file + decoded dimensions.
 * historyStack stores dataURL snapshots for undo.
 */

import { create } from 'zustand';

export const PANELS = {
  NONE:        'none',
  COLOR:       'color',
  CURVES:      'curves',
  LEVELS:      'levels',
  EFFECT:      'effect',
  EFFECT_II:   'effect_ii',
  FRAME:       'frame',
  CORRECTION:  'correction',
  DRAWING:     'drawing',
  PIXEL:       'pixel',
  CLONE:       'clone',
  CUT_OUT:     'cut_out',
  TEXT_SHAPE:  'text_shape',
  ROTATION:    'rotation',
  STRAIGHTEN:  'straighten',
  CROP:        'crop',
  CROP_FREE:   'crop_free',
  PERSPECTIVE: 'perspective',
  RESIZE:      'resize',
  DENOISE:     'denoise',
  FIT:         'fit',
};

const MAX_UNDO = 30;

const useEditorStore = create((set, get) => ({
  // ── Which screen is visible ──────────────────────────────────
  view: 'home',   // 'home' | 'editor'

  // ── Loaded image state ───────────────────────────────────────
  // currentImage holds everything we know about the loaded file.
  currentImage: null,
  /*  shape: {
        objectURL: string,   // revokable URL for <img> / drawImage
        fileName:  string,
        fileSize:  number,
        mimeType:  string,
        width:     number,   // natural px width
        height:    number,   // natural px height
        megapixels: string,
      }
  */

  // ── Active tool panel ─────────────────────────────────────────
  activePanel: PANELS.NONE,

  // ── Canvas view ───────────────────────────────────────────────
  zoom: 100,            // 10–400, 100 = "fit"

  // ── Undo / redo stacks ────────────────────────────────────────
  // Each entry = dataURL string of the canvas at that point.
  undoStack: [],
  redoStack: [],

  // ── Per-panel adjustments ─────────────────────────────────────
  colorAdj: {
    brightness: 0, contrast: 0, saturation: 0,
    warmth: 0,     tint: 0,     vibrance: 0,
    highlights: 0, shadows: 0,  whites: 0,
    blacks: 0,     clarity: 0,
  },

  rotationAdj: {
    angle: 0,
    flipH: false,
    flipV: false,
  },

  cropAdj: {
    ratio: 'original',
  },

  // ── Actions ───────────────────────────────────────────────────

  /**
   * loadImageFile — called when the user picks a file via <input>.
   * Reads the file, decodes its natural dimensions, then transitions
   * the app from 'home' → 'editor'.
   */
  loadImageFile: (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    // Revoke previous objectURL to avoid memory leaks
    const prev = get().currentImage;
    if (prev?.objectURL) URL.revokeObjectURL(prev.objectURL);

    const objectURL = URL.createObjectURL(file);

    // Decode natural dimensions via HTMLImageElement
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const megapixels = ((w * h) / 1_000_000).toFixed(2);

      set({
        view: 'editor',
        currentImage: {
          objectURL,
          fileName:   file.name,
          fileSize:   file.size,
          mimeType:   file.type,
          width:      w,
          height:     h,
          megapixels,
        },
        activePanel: PANELS.NONE,
        undoStack:   [],
        redoStack:   [],
        zoom:        100,
        colorAdj: {
          brightness: 0, contrast: 0, saturation: 0,
          warmth: 0,     tint: 0,     vibrance: 0,
          highlights: 0, shadows: 0,  whites: 0,
          blacks: 0,     clarity: 0,
        },
        rotationAdj: { angle: 0, flipH: false, flipV: false },
        cropAdj:     { ratio: 'original' },
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      alert('Could not load that image file. Please try another.');
    };
    img.src = objectURL;
  },

  /**
   * goHome — closes the editor and returns to the dashboard.
   */
  goHome: () => {
    const prev = get().currentImage;
    if (prev?.objectURL) URL.revokeObjectURL(prev.objectURL);
    set({
      view: 'home',
      currentImage: null,
      activePanel: PANELS.NONE,
      undoStack: [],
      redoStack: [],
    });
  },

  // ── Panel navigation ─────────────────────────────────────────
  setActivePanel: (panelId) => {
    const cur = get().activePanel;
    set({ activePanel: cur === panelId ? PANELS.NONE : panelId });
  },
  closePanel: () => set({ activePanel: PANELS.NONE }),

  // ── Zoom ─────────────────────────────────────────────────────
  setZoom: (z) => set({ zoom: Math.max(10, Math.min(400, z)) }),

  // ── Undo / redo ───────────────────────────────────────────────
  // snapshot is a dataURL; push BEFORE applying a destructive op.
  pushUndo: (dataURL) => {
    set((s) => ({
      undoStack: [dataURL, ...s.undoStack].slice(0, MAX_UNDO),
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (!undoStack.length) return;
    const [head, ...rest] = undoStack;
    set({ undoStack: rest, redoStack: [head, ...redoStack] });
    return head;   // caller redraws canvas with this dataURL
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (!redoStack.length) return;
    const [head, ...rest] = redoStack;
    set({ redoStack: rest, undoStack: [head, ...undoStack] });
    return head;
  },

  // ── Adjustment setters ────────────────────────────────────────
  updateColorAdj:    (patch) => set((s) => ({ colorAdj:    { ...s.colorAdj,    ...patch } })),
  updateRotationAdj: (patch) => set((s) => ({ rotationAdj: { ...s.rotationAdj, ...patch } })),
  updateCropAdj:     (patch) => set((s) => ({ cropAdj:     { ...s.cropAdj,     ...patch } })),
}));

export default useEditorStore;
