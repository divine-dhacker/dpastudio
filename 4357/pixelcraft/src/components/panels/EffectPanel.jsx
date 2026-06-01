/**
 * EffectPanel.jsx  v2.1
 * Undo integration:
 *   - Selecting a filter thumbnail: captureNow() before toggle.
 *   - Shape button: captureNow() before change.
 *   - Radius slider: captureBeforeDrag() + endDrag().
 */
import React from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './EffectPanel.css';

const EFFECTS_I = [
  'Vivid','Blend Color','Fill','Bloom','Diffuse','Sharpen',
  'Unsharp Mask','Blur','Smart Blur','Zoom Blur','Sketch','Oil Paint',
];
const EFFECTS_II = [
  'Pencil','Watercolor','Neon','Emboss','Mosaic','Posterize',
  'Solarize','Infrared','Vignette','Grain','Cross Process','Duotone',
];
const SHAPES = [
  { id: 'circle',   icon: '◎', label: 'Circle'   },
  { id: 'linear',   icon: '≡', label: 'Linear'   },
  { id: 'grid',     icon: '⊞', label: 'Grid'     },
  { id: 'radial',   icon: '⊙', label: 'Radial'   },
  { id: 'contrast', icon: '◑', label: 'Contrast' },
];
const SWATCH = {
  'Vivid':'linear-gradient(135deg,#ff6b6b,#ffd93d)',
  'Blend Color':'linear-gradient(135deg,#a29bfe,#fd79a8)',
  'Fill':'linear-gradient(135deg,#55efc4,#00cec9)',
  'Bloom':'linear-gradient(135deg,#fddb92,#d1fdff)',
  'Diffuse':'linear-gradient(135deg,#e0c3fc,#8ec5fc)',
  'Sharpen':'linear-gradient(135deg,#f5f7fa,#c3cfe2)',
  'Unsharp Mask':'linear-gradient(135deg,#d4d4d4,#999)',
  'Blur':'linear-gradient(135deg,#b2bec3,#636e72)',
  'Smart Blur':'linear-gradient(135deg,#74b9ff,#0984e3)',
  'Zoom Blur':'linear-gradient(135deg,#ffffff,#6c5ce7)',
  'Sketch':'linear-gradient(135deg,#f5f5f5,#333)',
  'Oil Paint':'linear-gradient(135deg,#f9ca24,#f0932b)',
  'Pencil':'linear-gradient(135deg,#eee,#555)',
  'Watercolor':'linear-gradient(135deg,#a8edea,#fed6e3)',
  'Neon':'linear-gradient(135deg,#43e97b,#38f9d7)',
  'Emboss':'linear-gradient(135deg,#c7c7c7,#7f7f7f)',
  'Mosaic':'linear-gradient(135deg,#f093fb,#f5576c)',
  'Posterize':'linear-gradient(135deg,#4facfe,#00f2fe)',
  'Solarize':'linear-gradient(135deg,#f7971e,#ffd200)',
  'Infrared':'linear-gradient(135deg,#dc3545,#6f42c1)',
  'Vignette':'radial-gradient(circle,#444 0%,#000 100%)',
  'Grain':'linear-gradient(135deg,#c9d6ff,#e2e2e2)',
  'Cross Process':'linear-gradient(135deg,#ee0979,#ff6a00)',
  'Duotone':'linear-gradient(135deg,#2980b9,#6dd5fa)',
};

export default function EffectPanel({ variant = 'i' }) {
  const { effectState, updateEffectState } = useEditorStore();
  const { activeEffect, shape, radius } = effectState;
  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();
  const effects = variant === 'ii' ? EFFECTS_II : EFFECTS_I;

  const handleEffectClick = (name) => {
    captureNow();
    updateEffectState({ activeEffect: activeEffect === name ? null : name });
  };

  const handleShapeClick = (id) => {
    captureNow();
    updateEffectState({ shape: id });
  };

  return (
    <div className="effect-panel">
      <div className="effect-panel__grid">
        {effects.map((name) => (
          <button key={name}
            className={`effect-panel__thumb ${activeEffect === name ? 'active' : ''}`}
            onClick={() => handleEffectClick(name)}
            aria-pressed={activeEffect === name}
            aria-label={name}>
            <div className="effect-panel__swatch"
              style={{ background: SWATCH[name] || '#333' }} />
            <span className="effect-panel__thumb-label">{name}</span>
          </button>
        ))}
      </div>

      <div className="effect-panel__shape-row">
        <span className="effect-panel__row-label">Shape</span>
        <div className="effect-panel__shape-btns">
          {SHAPES.map((s) => (
            <button key={s.id}
              className={`effect-panel__shape-btn ${shape === s.id ? 'active' : ''}`}
              onClick={() => handleShapeClick(s.id)}
              aria-label={s.label} aria-pressed={shape === s.id} title={s.label}>
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="effect-panel__radius-row">
        <span className="effect-panel__row-label">Radius</span>
        <input type="range" min={0} max={100} value={radius}
          onMouseDown={captureBeforeDrag}
          onTouchStart={captureBeforeDrag}
          onMouseUp={endDrag}
          onTouchEnd={endDrag}
          onChange={(e) => updateEffectState({ radius: Number(e.target.value) })}
          aria-label="Effect radius" />
        <span className="effect-panel__radius-val">{radius}</span>
      </div>
    </div>
  );
}
