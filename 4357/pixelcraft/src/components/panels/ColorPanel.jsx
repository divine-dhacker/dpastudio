/**
 * ColorPanel.jsx  v2.1
 * Undo integration:
 *   - captureBeforeDrag() fires on slider pointerdown / touchstart
 *     → one undo entry per drag gesture, not per tick.
 *   - endDrag() fires on pointerup / touchend to reset the guard.
 *   - Reset (label click) and Reset All fire captureNow() first.
 */
import React from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './ColorPanel.css';

const CONTROLS = [
  { key: 'exposure',   label: 'Exposure',   min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast',   label: 'Contrast',   min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'warmth',     label: 'Warmth',     min: -100, max: 100 },
  { key: 'tint',       label: 'Tint',       min: -100, max: 100 },
  { key: 'vibrance',   label: 'Vibrance',   min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows',    label: 'Shadows',    min: -100, max: 100 },
  { key: 'whites',     label: 'Whites',     min: -100, max: 100 },
  { key: 'blacks',     label: 'Blacks',     min: -100, max: 100 },
  { key: 'clarity',    label: 'Clarity',    min: -100, max: 100 },
];

export default function ColorPanel() {
  const { colorAdj, updateColorAdj } = useEditorStore();
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const handleReset = (key) => {
    captureNow();
    updateColorAdj({ [key]: 0 });
  };

  const resetAll = () => {
    captureNow();
    const zeros = {};
    CONTROLS.forEach(({ key }) => { zeros[key] = 0; });
    updateColorAdj(zeros);
  };

  return (
    <div className="color-panel">
      <div className="color-panel__reset-row">
        <button className="color-panel__reset-all" onClick={resetAll}>
          Reset All
        </button>
      </div>

      {CONTROLS.map(({ key, label, min, max }) => {
        const val = colorAdj[key] ?? 0;
        const pct = ((val - min) / (max - min)) * 100;

        return (
          <div className="color-panel__row" key={key}>
            <button
              className="color-panel__label-btn"
              onClick={() => handleReset(key)}
              title={`Reset ${label} to 0`}
            >
              {label}
            </button>

            <div className="color-panel__slider-track">
              <div
                className="color-panel__slider-fill"
                style={{ width: `${pct}%` }}
              />
              <input
                type="range"
                min={min}
                max={max}
                value={val}
                step={1}
                onMouseDown={captureBeforeDrag}
                onTouchStart={captureBeforeDrag}
                onMouseUp={endDrag}
                onTouchEnd={endDrag}
                onChange={(e) => updateColorAdj({ [key]: Number(e.target.value) })}
                aria-label={label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={val}
              />
            </div>

            <span className={`color-panel__value ${val > 0 ? 'pos' : val < 0 ? 'neg' : ''}`}>
              {val > 0 ? `+${val}` : val}
            </span>
          </div>
        );
      })}
    </div>
  );
}
