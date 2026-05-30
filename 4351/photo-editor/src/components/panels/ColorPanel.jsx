/**
 * ColorPanel.jsx
 * Basic tone adjustments: Brightness, Contrast, Saturation,
 * Warmth, Tint, Vibrance, Highlights, Shadows, Whites, Blacks, Clarity.
 */

import React from 'react';
import useEditorStore from '../../store/editorStore';
import './ColorPanel.css';

const CONTROLS = [
  { key: 'brightness',  label: 'Brightness',  min: -100, max: 100 },
  { key: 'contrast',    label: 'Contrast',    min: -100, max: 100 },
  { key: 'saturation',  label: 'Saturation',  min: -100, max: 100 },
  { key: 'warmth',      label: 'Warmth',      min: -100, max: 100 },
  { key: 'tint',        label: 'Tint',        min: -100, max: 100 },
  { key: 'vibrance',    label: 'Vibrance',    min: -100, max: 100 },
  { key: 'highlights',  label: 'Highlights',  min: -100, max: 100 },
  { key: 'shadows',     label: 'Shadows',     min: -100, max: 100 },
  { key: 'whites',      label: 'Whites',      min: -100, max: 100 },
  { key: 'blacks',      label: 'Blacks',      min: -100, max: 100 },
  { key: 'clarity',     label: 'Clarity',     min: -100, max: 100 },
];

export default function ColorPanel() {
  const { colorState, updateColorState } = useEditorStore();

  const handleReset = (key) => updateColorState({ [key]: 0 });

  return (
    <div className="color-panel">
      {CONTROLS.map(({ key, label, min, max }) => (
        <div className="color-panel__row" key={key}>
          <button
            className="color-panel__label-btn"
            onClick={() => handleReset(key)}
            title={`Reset ${label}`}
            aria-label={`Reset ${label}`}
          >
            {label}
          </button>
          <input
            type="range"
            min={min}
            max={max}
            value={colorState[key]}
            onChange={(e) => updateColorState({ [key]: Number(e.target.value) })}
            aria-label={label}
          />
          <span className="color-panel__value">
            {colorState[key] > 0 ? `+${colorState[key]}` : colorState[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
