/**
 * LevelsPanel.jsx
 * Black / White / Gamma level adjustments overlaid on a histogram.
 * Matches screenshot: Input(Low), Input(High), Gamma, Output(Low), Output(High).
 */

import React from 'react';
import useEditorStore from '../../store/editorStore';
import './LevelsPanel.css';

const CHANNELS = ['RGB', 'R', 'G', 'B'];

function SliderRow({ label, value, min, max, step = 1, onChange, displayValue }) {
  return (
    <div className="levels-panel__row">
      <span className="levels-panel__label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className="levels-panel__value">
        {displayValue !== undefined ? displayValue : value}
      </span>
    </div>
  );
}

export default function LevelsPanel() {
  const { levelsState, updateLevelsState } = useEditorStore();
  const { channel, inputLow, inputHigh, gamma, outputLow, outputHigh } = levelsState;

  return (
    <div className="levels-panel">
      {/* Channel tabs */}
      <div className="levels-panel__channels">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            className={`btn levels-panel__ch-btn ${channel === ch ? 'active' : ''}`}
            onClick={() => updateLevelsState({ channel: ch })}
          >
            {ch}
          </button>
        ))}
        <button className="icon-btn levels-panel__ch-btn">★</button>
        <button className="icon-btn levels-panel__ch-btn">≡</button>
      </div>

      {/* Controls */}
      <div className="levels-panel__controls">
        <SliderRow
          label="Input (Low)"
          value={inputLow}
          min={0}
          max={inputHigh - 1}
          onChange={(v) => updateLevelsState({ inputLow: v })}
        />
        <SliderRow
          label="Input (High)"
          value={inputHigh}
          min={inputLow + 1}
          max={255}
          onChange={(v) => updateLevelsState({ inputHigh: v })}
        />
        <SliderRow
          label="Gamma"
          value={gamma}
          min={0.1}
          max={9.9}
          step={0.1}
          onChange={(v) => updateLevelsState({ gamma: v })}
          displayValue={gamma.toFixed(1)}
        />
        <SliderRow
          label="Output (Low)"
          value={outputLow}
          min={0}
          max={outputHigh - 1}
          onChange={(v) => updateLevelsState({ outputLow: v })}
        />
        <SliderRow
          label="Output (High)"
          value={outputHigh}
          min={outputLow + 1}
          max={255}
          onChange={(v) => updateLevelsState({ outputHigh: v })}
        />
      </div>
    </div>
  );
}
