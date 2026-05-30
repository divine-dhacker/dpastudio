/**
 * PerspectivePanel.jsx
 * Shows the correction tool list (Temperature, White Balance, Backlight,
 * Perspective, Perspective II, Lens, Red Eye, Whiten).
 * Quad-corner handle overlay is rendered directly on the canvas in App.jsx.
 */

import React from 'react';
import './PerspectivePanel.css';

const CORRECTIONS = [
  'Temperature', 'White Balance',
  'Backlight',   'Perspective',
  'Perspective II', 'Lens',
  'Red Eye',     'Whiten',
];

export default function PerspectivePanel() {
  return (
    <div className="perspective-panel">
      <div className="perspective-panel__grid">
        {CORRECTIONS.map((name) => (
          <button key={name} className="btn perspective-panel__btn">
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
