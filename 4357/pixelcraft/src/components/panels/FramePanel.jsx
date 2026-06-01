/**
 * FramePanel.jsx  v2.1
 * Undo integration:
 *   - Style button click: captureNow().
 *   - Thickness/radius sliders: captureBeforeDrag() + endDrag().
 *   - Color picker: captureNow() on focus (once per pick session).
 */
import React, { useState } from 'react';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './FramePanel.css';

const FRAME_STYLES = [
  { id: 'none',     label: 'None',      preview: 'transparent'           },
  { id: 'solid',    label: 'Solid',     preview: '#ffffff'               },
  { id: 'shadow',   label: 'Shadow',    preview: 'rgba(0,0,0,0.6)'      },
  { id: 'glow',     label: 'Glow',      preview: 'rgba(26,115,232,0.7)' },
  { id: 'polaroid', label: 'Polaroid',  preview: '#f5f5f0'              },
  { id: 'film',     label: 'Film',      preview: '#1a1a1a'              },
  { id: 'vintage',  label: 'Vintage',   preview: '#c8a97e'              },
  { id: 'neon',     label: 'Neon',      preview: 'rgba(67,233,123,0.8)' },
];

export default function FramePanel() {
  const [style,     setStyle]     = useState('none');
  const [thickness, setThickness] = useState(20);
  const [color,     setColor]     = useState('#ffffff');
  const [radius,    setRadius]    = useState(0);
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const handleStyleClick = (id) => {
    if (id !== style) captureNow();
    setStyle(id);
  };

  return (
    <div className="frame-panel">
      <div className="frame-panel__grid">
        {FRAME_STYLES.map((f) => (
          <button key={f.id}
            className={`frame-panel__style-btn ${style === f.id ? 'active' : ''}`}
            onClick={() => handleStyleClick(f.id)}
            aria-pressed={style === f.id}>
            <div className="frame-panel__preview"
              style={{ background: f.preview,
                border: f.id === 'none' ? '1px dashed var(--c-border)' : 'none' }} />
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {style !== 'none' && (
        <div className="frame-panel__controls">
          <div className="frame-panel__row">
            <span className="frame-panel__label">Thickness</span>
            <input type="range" min={1} max={120} value={thickness}
              onMouseDown={captureBeforeDrag}
              onTouchStart={captureBeforeDrag}
              onMouseUp={endDrag}
              onTouchEnd={endDrag}
              onChange={(e) => setThickness(Number(e.target.value))} />
            <span className="frame-panel__val">{thickness}px</span>
          </div>
          <div className="frame-panel__row">
            <span className="frame-panel__label">Color</span>
            <input type="color" className="frame-panel__color" value={color}
              onFocus={captureBeforeDrag}
              onBlur={endDrag}
              onChange={(e) => setColor(e.target.value)} />
            <span className="frame-panel__val">{color.toUpperCase()}</span>
          </div>
          <div className="frame-panel__row">
            <span className="frame-panel__label">Radius</span>
            <input type="range" min={0} max={120} value={radius}
              onMouseDown={captureBeforeDrag}
              onTouchStart={captureBeforeDrag}
              onMouseUp={endDrag}
              onTouchEnd={endDrag}
              onChange={(e) => setRadius(Number(e.target.value))} />
            <span className="frame-panel__val">{radius}px</span>
          </div>
        </div>
      )}
    </div>
  );
}
