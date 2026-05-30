/**
 * EffectPanel.jsx
 * Filter thumbnails grid + shape selector + radius slider.
 * Matches screenshot: Vivid | Blend Color | Fill | Bloom | Diffuse |
 * Sharpen | Unsharp Mask | Blur | Smart Blur | Zoom Blur | Sketch | Oil Paint
 */

import React from 'react';
import useEditorStore from '../../store/editorStore';
import './EffectPanel.css';

const EFFECTS = [
  'Vivid', 'Blend Color', 'Fill',
  'Bloom', 'Diffuse', 'Sharpen',
  'Unsharp Mask', 'Blur', 'Smart Blur',
  'Zoom Blur', 'Sketch', 'Oil Paint',
  'Pencil', 'Watercolor', 'Neon',
  'Emboss', 'Mosaic', 'Posterize',
];

const SHAPES = [
  { id: 'circle',   icon: '◎', label: 'Circle'   },
  { id: 'linear',   icon: '≡', label: 'Linear'   },
  { id: 'grid',     icon: '⊞', label: 'Grid'     },
  { id: 'radial',   icon: '⊙', label: 'Radial'   },
  { id: 'contrast', icon: '◑', label: 'Contrast' },
];

export default function EffectPanel() {
  const { effectState, updateEffectState } = useEditorStore();
  const { activeEffect, shape, radius } = effectState;

  return (
    <div className="effect-panel">
      {/* Effect thumbnail grid */}
      <div className="effect-panel__grid">
        {EFFECTS.map((name) => (
          <button
            key={name}
            className={`effect-panel__thumb ${activeEffect === name ? 'active' : ''}`}
            onClick={() => updateEffectState({ activeEffect: name })}
            aria-pressed={activeEffect === name}
            aria-label={name}
          >
            <div className="effect-panel__thumb-img" aria-hidden="true" />
            <span className="effect-panel__thumb-label">{name}</span>
          </button>
        ))}
      </div>

      {/* Shape selector */}
      <div className="effect-panel__shape-row">
        <span className="effect-panel__row-label">Shape</span>
        <div className="effect-panel__shape-btns">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              className={`btn effect-panel__shape-btn ${shape === s.id ? 'active' : ''}`}
              onClick={() => updateEffectState({ shape: s.id })}
              aria-label={s.label}
              aria-pressed={shape === s.id}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Radius slider */}
      <div className="effect-panel__radius-row">
        <span className="effect-panel__row-label">Radius</span>
        <input
          type="range"
          min={0}
          max={100}
          value={radius}
          onChange={(e) => updateEffectState({ radius: Number(e.target.value) })}
          aria-label="Effect radius"
        />
        <button className="icon-btn" aria-label="Favourite radius">★</button>
      </div>
    </div>
  );
}
