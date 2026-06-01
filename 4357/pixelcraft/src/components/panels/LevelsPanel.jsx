/**
 * LevelsPanel.jsx  v2.1
 * Undo integration:
 *   - captureBeforeDrag() on slider pointerdown / touchstart.
 *   - endDrag() on pointerup / touchend.
 *   - Reset fires captureNow() first.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './LevelsPanel.css';

const CHANNELS = ['RGB', 'R', 'G', 'B'];
const CH_COLOR  = { RGB: '#aaaaaa', R: '#e53935', G: '#43a047', B: '#1e88e5' };

function SliderRow({ label, value, min, max, step = 1, onChange, display, onDragStart, onDragEnd }) {
  return (
    <div className="levels-panel__row">
      <span className="levels-panel__label">{label}</span>
      <input type="range" min={min} max={max} step={step}
        value={value}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        onMouseUp={onDragEnd}
        onTouchEnd={onDragEnd}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label} />
      <span className="levels-panel__value">
        {display !== undefined ? display : value}
      </span>
    </div>
  );
}

export default function LevelsPanel({ histogramData }) {
  const { levelsState, updateLevelsState } = useEditorStore();
  const { channel, inputLow, inputHigh, gamma, outputLow, outputHigh } = levelsState;
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const canvasRef = useRef(null);

  const drawHist = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !histogramData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(0, 0, W, H);

    const chMap = { RGB: 'luma', R: 'r', G: 'g', B: 'b' };
    const data  = histogramData[chMap[channel]];
    if (!data) return;

    const maxVal = Math.max(...data, 1);
    ctx.fillStyle = CH_COLOR[channel];
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * W;
      const h = (data[i] / maxVal) * H * 0.9;
      ctx.fillRect(x, H - h, W / 256 + 1, h);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(26,115,232,0.15)';
    ctx.fillRect((inputLow/255)*W, 0, ((inputHigh-inputLow)/255)*W, H);

    ctx.lineWidth = 1;
    ctx.setLineDash([3,3]);
    [[inputLow,'white'],[inputHigh,'white']].forEach(([v,c]) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo((v/255)*W, 0);
      ctx.lineTo((v/255)*W, H);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }, [histogramData, channel, inputLow, inputHigh]);

  useEffect(() => { drawHist(); }, [drawHist]);

  const reset = () => {
    captureNow();
    updateLevelsState({ inputLow: 0, inputHigh: 255, gamma: 1.0, outputLow: 0, outputHigh: 255 });
  };

  return (
    <div className="levels-panel">
      <div className="levels-panel__tabs">
        {CHANNELS.map((ch) => (
          <button key={ch}
            className={`levels-panel__tab ${channel === ch ? 'active' : ''}`}
            style={channel === ch ? { color: CH_COLOR[ch], borderBottomColor: CH_COLOR[ch] } : {}}
            onClick={() => updateLevelsState({ channel: ch })}>
            {ch}
          </button>
        ))}
        <button className="levels-panel__tab-icon" onClick={reset} title="Reset levels">↺</button>
      </div>

      <div className="levels-panel__hist-wrap">
        <canvas ref={canvasRef} width={256} height={80}
          className="levels-panel__hist" aria-label="Histogram" />
      </div>

      <div className="levels-panel__controls">
        <div className="levels-panel__group-label">Input</div>
        <SliderRow label="Low"   value={inputLow}  min={0}            max={inputHigh - 1}
          onDragStart={captureBeforeDrag} onDragEnd={endDrag}
          onChange={(v) => updateLevelsState({ inputLow: v })} />
        <SliderRow label="High"  value={inputHigh} min={inputLow + 1}  max={255}
          onDragStart={captureBeforeDrag} onDragEnd={endDrag}
          onChange={(v) => updateLevelsState({ inputHigh: v })} />
        <SliderRow label="Gamma" value={gamma} min={0.1} max={9.9} step={0.1}
          onDragStart={captureBeforeDrag} onDragEnd={endDrag}
          onChange={(v) => updateLevelsState({ gamma: v })}
          display={gamma.toFixed(1)} />

        <div className="levels-panel__group-label">Output</div>
        <SliderRow label="Low"   value={outputLow}  min={0}             max={outputHigh - 1}
          onDragStart={captureBeforeDrag} onDragEnd={endDrag}
          onChange={(v) => updateLevelsState({ outputLow: v })} />
        <SliderRow label="High"  value={outputHigh} min={outputLow + 1}  max={255}
          onDragStart={captureBeforeDrag} onDragEnd={endDrag}
          onChange={(v) => updateLevelsState({ outputHigh: v })} />
      </div>
    </div>
  );
}
