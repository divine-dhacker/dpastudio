/**
 * RotationPanel.jsx
 * Angle slider, fine-tune nudge buttons (-1°, -0.1°, +0.1°, +1°),
 * flip horizontal/vertical, and 90° rotation buttons.
 * Matches the portrait screenshot with top angle display + 3×3 grid overlay.
 */

import React from 'react';
import useEditorStore from '../../store/editorStore';
import './RotationPanel.css';

const IconFlipH = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <polyline points="4 8 2 12 4 16"/>
    <polyline points="20 8 22 12 20 16"/>
  </svg>
);

const IconFlipV = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <polyline points="8 4 12 2 16 4"/>
    <polyline points="8 20 12 22 16 20"/>
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function RotationPanel() {
  const { rotationState, updateRotationState } = useEditorStore();
  const { angle, flipH, flipV } = rotationState;

  const nudge = (delta) => {
    updateRotationState({ angle: Math.round((angle + delta) * 10) / 10 });
  };

  const setAngle = (v) => {
    updateRotationState({ angle: Math.round(v * 10) / 10 });
  };

  return (
    <div className="rotation-panel">
      {/* Angle display */}
      <div className="rotation-panel__angle-display">
        {angle.toFixed(1)}°
      </div>

      {/* Slider */}
      <div className="rotation-panel__slider-row">
        <button className="btn rotation-panel__pencil-btn" aria-label="Free draw angle">
          ✏
        </button>
        <input
          type="range"
          min={-180}
          max={180}
          step={0.1}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          aria-label="Rotation angle"
        />
      </div>

      {/* Action buttons row */}
      <div className="rotation-panel__actions">
        {/* Nudge -0.1° */}
        <button
          className="btn rotation-panel__nudge-btn"
          onClick={() => nudge(-0.1)}
          aria-label="-0.1 degrees"
        >
          −0.1°
        </button>

        {/* +90 rotation */}
        <button
          className="btn rotation-panel__action-btn"
          onClick={() => setAngle(angle + 90)}
          aria-label="Rotate +90 degrees"
        >
          +90
        </button>

        {/* Reset to 0 */}
        <button
          className="btn rotation-panel__action-btn"
          onClick={() => updateRotationState({ angle: 0 })}
          aria-label="Reset angle to 0"
        >
          0
        </button>

        {/* Flip horizontal */}
        <button
          className={`btn rotation-panel__action-btn ${flipH ? 'active' : ''}`}
          onClick={() => updateRotationState({ flipH: !flipH })}
          aria-label="Flip horizontal"
          aria-pressed={flipH}
        >
          <IconFlipH />
        </button>

        {/* Flip vertical */}
        <button
          className={`btn rotation-panel__action-btn ${flipV ? 'active' : ''}`}
          onClick={() => updateRotationState({ flipV: !flipV })}
          aria-label="Flip vertical"
          aria-pressed={flipV}
        >
          <IconFlipV />
        </button>

        {/* Settings */}
        <button
          className="icon-btn rotation-panel__action-btn"
          aria-label="Rotation settings"
        >
          <IconSettings />
        </button>
      </div>

      {/* Fine nudge row */}
      <div className="rotation-panel__nudges">
        <button className="btn rotation-panel__nudge-btn" onClick={() => nudge(-1)}>−1°</button>
        <button className="btn rotation-panel__nudge-btn" onClick={() => nudge(-0.1)}>−0.1°</button>
        <button className="btn rotation-panel__nudge-btn" onClick={() => nudge(+0.1)}>+0.1°</button>
        <button className="btn rotation-panel__nudge-btn" onClick={() => nudge(+1)}>+1°</button>
      </div>
    </div>
  );
}
