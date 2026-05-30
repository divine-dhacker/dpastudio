/**
 * ResizePanel.jsx — Dimensions input with aspect-lock toggle.
 */
import React from 'react';
import useEditorStore from '../../store/editorStore';
import './ResizePanel.css';

export default function ResizePanel() {
  const { resizeState, updateResizeState, image } = useEditorStore();
  const { width, height, lockAspect } = resizeState;
  const aspectRatio = image.width / (image.height || 1);

  const handleWidth = (v) => {
    const w = Math.max(1, parseInt(v, 10) || 0);
    updateResizeState({ width: w, height: lockAspect ? Math.round(w / aspectRatio) : height });
  };

  const handleHeight = (v) => {
    const h = Math.max(1, parseInt(v, 10) || 0);
    updateResizeState({ height: h, width: lockAspect ? Math.round(h * aspectRatio) : width });
  };

  return (
    <div className="resize-panel">
      <div className="resize-panel__row">
        <label className="resize-panel__label">Width</label>
        <input
          className="resize-panel__input"
          type="number"
          min={1}
          value={width}
          onChange={(e) => handleWidth(e.target.value)}
        />
        <span className="resize-panel__unit">px</span>
      </div>
      <div className="resize-panel__row">
        <label className="resize-panel__label">Height</label>
        <input
          className="resize-panel__input"
          type="number"
          min={1}
          value={height}
          onChange={(e) => handleHeight(e.target.value)}
        />
        <span className="resize-panel__unit">px</span>
      </div>
      <div className="resize-panel__row">
        <label className="resize-panel__label">Lock Aspect</label>
        <button
          className={`btn resize-panel__lock-btn ${lockAspect ? 'active' : ''}`}
          onClick={() => updateResizeState({ lockAspect: !lockAspect })}
          aria-pressed={lockAspect}
        >
          {lockAspect ? '🔒 Locked' : '🔓 Free'}
        </button>
      </div>
    </div>
  );
}
