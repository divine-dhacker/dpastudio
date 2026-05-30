/**
 * TextShapePanel.jsx — Text/image layer controls (stub).
 */
import React from 'react';
import './TextShapePanel.css';

export default function TextShapePanel() {
  return (
    <div className="text-shape-panel">
      <div className="text-shape-panel__placeholder">
        <p>Text / Image Layer</p>
        <p className="sub">Tap canvas to place text or import an overlay image.</p>
      </div>
    </div>
  );
}
