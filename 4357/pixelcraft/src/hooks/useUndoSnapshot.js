/**
 * useUndoSnapshot.js
 * =====================================================================
 * Shared hook used by every panel to push an undo snapshot.
 *
 * Strategy:
 *   • Sliders  → call `captureBeforeDrag()` on pointerdown / touchstart,
 *                BEFORE the value changes. One undo entry per drag gesture.
 *   • Buttons  → call `captureNow()` on click, before the state mutation.
 *
 * The snapshot is a compact JPEG dataURL of the current canvas, stored
 * in the undo stack inside editorStore. On undo, App.jsx reloads it.
 *
 * We read the canvas snapshot directly from editorStore._canvasSnapshot
 * so we never need a ref to the canvas element from inside a panel.
 * =====================================================================
 */

import { useCallback, useRef } from 'react';
import useEditorStore from '../store/editorStore';

export function useUndoSnapshot() {
  const { pushUndo, _canvasSnapshot } = useEditorStore();

  /**
   * captureNow — push the current canvas snapshot immediately.
   * Use for discrete actions: button clicks, toggles, selects.
   */
  const captureNow = useCallback(() => {
    const snap = useEditorStore.getState()._canvasSnapshot;
    if (snap) pushUndo(snap);
  }, [pushUndo]);

  /**
   * captureBeforeDrag — safe to call repeatedly on pointerdown.
   * Only pushes once per drag gesture by tracking whether a drag
   * is already in progress with a ref.
   */
  const dragging = useRef(false);

  const captureBeforeDrag = useCallback(() => {
    if (dragging.current) return;
    dragging.current = true;
    const snap = useEditorStore.getState()._canvasSnapshot;
    if (snap) pushUndo(snap);
  }, [pushUndo]);

  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  return { captureNow, captureBeforeDrag, endDrag };
}

export default useUndoSnapshot;
