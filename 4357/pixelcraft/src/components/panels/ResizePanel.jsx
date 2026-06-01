/**
 * ResizePanel.jsx  v2.1
 * Undo integration:
 *   - Number input onFocus captures snapshot once per focus session.
 *   - Reset button fires captureNow() before resetting.
 */
import React, { useCallback } from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './ResizePanel.css';

export default function ResizePanel() {
  const { resizeState, updateResizeState, currentImage } = useEditorStore();
  const { width, height, lockAspect } = resizeState;
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const ar = currentImage?.width
    ? currentImage.width / (currentImage.height || 1)
    : 1;

  const setW = (v) => {
    const w = Math.max(1, parseInt(v, 10) || 1);
    updateResizeState({ width: w, height: lockAspect ? Math.round(w / ar) : height });
  };
  const setH = (v) => {
    const h = Math.max(1, parseInt(v, 10) || 1);
    updateResizeState({ height: h, width: lockAspect ? Math.round(h * ar) : width });
  };

  const reset = () => {
    if (currentImage) {
      captureNow();
      updateResizeState({ width: currentImage.width, height: currentImage.height });
    }
  };

  const mp = ((width * height) / 1_000_000).toFixed(2);

  return (
    <div className="resize-panel">
      <div className="resize-panel__fields">
        <div className="resize-panel__field">
          <label className="resize-panel__label">Width</label>
          <div className="resize-panel__input-wrap">
            <input className="resize-panel__input" type="number" min="1" max="16384"
              value={width}
              onFocus={captureBeforeDrag}
              onBlur={endDrag}
              onChange={(e) => setW(e.target.value)} />
            <span className="resize-panel__unit">px</span>
          </div>
        </div>

        <button
          className={`resize-panel__lock ${lockAspect ? 'locked' : ''}`}
          onClick={() => updateResizeState({ lockAspect: !lockAspect })}
          aria-pressed={lockAspect}
          aria-label={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}>
          {lockAspect ? '🔒' : '🔓'}
        </button>

        <div className="resize-panel__field">
          <label className="resize-panel__label">Height</label>
          <div className="resize-panel__input-wrap">
            <input className="resize-panel__input" type="number" min="1" max="16384"
              value={height}
              onFocus={captureBeforeDrag}
              onBlur={endDrag}
              onChange={(e) => setH(e.target.value)} />
            <span className="resize-panel__unit">px</span>
          </div>
        </div>
      </div>

      <p className="resize-panel__mp">{mp} megapixels</p>
      {currentImage && (
        <p className="resize-panel__original">
          Original: {currentImage.width} × {currentImage.height} px
        </p>
      )}
      <button className="resize-panel__reset" onClick={reset}>
        Reset to Original
      </button>
    </div>
  );
}
