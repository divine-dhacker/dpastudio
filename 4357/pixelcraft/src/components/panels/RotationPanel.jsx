/**
 * RotationPanel.jsx  v2.1
 * Undo integration:
 *   - captureBeforeDrag() on slider pointerdown.
 *   - endDrag() on pointerup.
 *   - Nudge buttons, 90° rotate, flip, and reset fire captureNow() first.
 */
import React from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './RotationPanel.css';

const IcoFlipH = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <polyline points="5 8 2 12 5 16"/>
    <polyline points="19 8 22 12 19 16"/>
  </svg>
);

const IcoFlipV = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <polyline points="8 5 12 2 16 5"/>
    <polyline points="8 19 12 22 16 19"/>
  </svg>
);

export default function RotationPanel({ straightenMode = false }) {
  const { rotationAdj, updateRotationAdj } = useEditorStore();
  const { angle, flipH, flipV } = rotationAdj;
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const nudge = (d) => {
    captureNow();
    updateRotationAdj({ angle: Math.round((angle + d) * 10) / 10 });
  };

  const setAngle = (v) =>
    updateRotationAdj({ angle: Math.round(v * 10) / 10 });

  const rotate90 = (dir) => {
    captureNow();
    setAngle(angle + dir * 90);
  };

  const handleReset = () => {
    captureNow();
    updateRotationAdj({ angle: 0, flipH: false, flipV: false });
  };

  const handleFlipH = () => { captureNow(); updateRotationAdj({ flipH: !flipH }); };
  const handleFlipV = () => { captureNow(); updateRotationAdj({ flipV: !flipV }); };

  return (
    <div className="rotation-panel">
      <div className="rotation-panel__display">
        <span className="rotation-panel__angle">{angle.toFixed(1)}°</span>
        <span className="rotation-panel__label">
          {straightenMode ? 'Straighten' : 'Rotation'}
        </span>
      </div>

      <div className="rotation-panel__slider-row">
        <input type="range" min={-180} max={180} step={0.1} value={angle}
          onMouseDown={captureBeforeDrag}
          onTouchStart={captureBeforeDrag}
          onMouseUp={endDrag}
          onTouchEnd={endDrag}
          onChange={(e) => setAngle(Number(e.target.value))}
          aria-label="Rotation angle" />
      </div>

      <div className="rotation-panel__nudges">
        {[[-1,'−1°'],[-0.1,'−0.1°'],[0.1,'+0.1°'],[1,'+1°']].map(([d, lbl]) => (
          <button key={lbl} className="rotation-panel__nudge-btn"
            onClick={() => nudge(d)}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="rotation-panel__actions">
        <button className="rotation-panel__action-btn"
          onClick={() => rotate90(-1)} aria-label="Rotate −90°">−90°</button>
        <button className="rotation-panel__action-btn"
          onClick={() => rotate90(1)}  aria-label="Rotate +90°">+90°</button>
        <button className="rotation-panel__action-btn"
          onClick={handleReset} aria-label="Reset">Reset</button>
        <button className={`rotation-panel__action-btn ${flipH ? 'active' : ''}`}
          onClick={handleFlipH}
          aria-label="Flip horizontal" aria-pressed={flipH} title="Flip Horizontal">
          <IcoFlipH />
        </button>
        <button className={`rotation-panel__action-btn ${flipV ? 'active' : ''}`}
          onClick={handleFlipV}
          aria-label="Flip vertical" aria-pressed={flipV} title="Flip Vertical">
          <IcoFlipV />
        </button>
      </div>
    </div>
  );
}
