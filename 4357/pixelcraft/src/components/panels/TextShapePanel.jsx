/**
 * TextShapePanel.jsx  v2.1
 * Undo: captureNow() before placing text on canvas.
 * Font/size/color changes are local state only (no canvas commit yet),
 * so undo fires at the point of placement.
 */
import React, { useState } from 'react';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './TextShapePanel.css';

const FONTS   = ['DM Sans','Serif','Monospace','Cursive','Fantasy'];
const ALIGNS  = [
  { id: 'left',   icon: '⬅' },
  { id: 'center', icon: '↔' },
  { id: 'right',  icon: '➡' },
];

export default function TextShapePanel() {
  const [text,     setText]     = useState('');
  const [font,     setFont]     = useState('DM Sans');
  const [fontSize, setFontSize] = useState(48);
  const [color,    setColor]    = useState('#ffffff');
  const [align,    setAlign]    = useState('center');
  const [bold,     setBold]     = useState(false);
  const [italic,   setItalic]   = useState(false);
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const handlePlace = () => {
    captureNow();   // snapshot before placing text layer
    console.log('[TODO] Place text on canvas:', { text, font, fontSize, color, align, bold, italic });
  };

  return (
    <div className="text-shape-panel">
      <div className="tsp__row tsp__row--full">
        <textarea className="tsp__textarea"
          placeholder="Type here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3} />
      </div>

      <div className="tsp__row">
        <span className="tsp__label">Font</span>
        <select className="tsp__select" value={font}
          onChange={(e) => setFont(e.target.value)}>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="tsp__row">
        <span className="tsp__label">Size</span>
        <input className="tsp__num" type="number" min="8" max="400"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))} />
        <span className="tsp__unit">px</span>
        <input type="range" min={8} max={400} value={fontSize}
          onMouseDown={captureBeforeDrag}
          onTouchStart={captureBeforeDrag}
          onMouseUp={endDrag}
          onTouchEnd={endDrag}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="tsp__slider" aria-label="Font size" />
      </div>

      <div className="tsp__row">
        <span className="tsp__label">Color</span>
        <input className="tsp__color" type="color" value={color}
          onChange={(e) => setColor(e.target.value)} />
        <button className={`tsp__style-btn ${bold   ? 'active' : ''}`}
          onClick={() => setBold((v) => !v)} aria-pressed={bold}>
          <strong>B</strong>
        </button>
        <button className={`tsp__style-btn ${italic ? 'active' : ''}`}
          onClick={() => setItalic((v) => !v)} aria-pressed={italic}>
          <em>I</em>
        </button>
      </div>

      <div className="tsp__row">
        <span className="tsp__label">Align</span>
        <div className="tsp__align-btns">
          {ALIGNS.map((a) => (
            <button key={a.id}
              className={`tsp__align-btn ${align === a.id ? 'active' : ''}`}
              onClick={() => setAlign(a.id)} aria-pressed={align === a.id}>
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      <button className="tsp__place-btn"
        disabled={!text.trim()}
        onClick={handlePlace}>
        Place Text on Canvas
      </button>
    </div>
  );
}
