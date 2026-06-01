/**
 * CropPanel.jsx  v2.1
 * Undo: captureNow() before every ratio change and reset.
 */
import React from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './CropPanel.css';

const RATIOS = [
  { id: 'original', label: 'Original', icon: '⬜' },
  { id: '1:1',      label: '1 : 1',    icon: '■'  },
  { id: '4:3',      label: '4 : 3',    icon: '▬'  },
  { id: '3:2',      label: '3 : 2',    icon: '▬'  },
  { id: '16:9',     label: '16 : 9',   icon: '▬'  },
  { id: '9:16',     label: '9 : 16',   icon: '▮'  },
  { id: '21:9',     label: '21 : 9',   icon: '▬'  },
  { id: '3:4',      label: '3 : 4',    icon: '▮'  },
  { id: 'custom',   label: 'Custom',   icon: '✏'  },
];

export default function CropPanel({ freeMode = false }) {
  const { cropAdj, updateCropAdj } = useEditorStore();
  const { ratio } = cropAdj;
  const { captureNow } = useUndoSnapshot();

  const handleRatioSelect = (id) => {
    if (id === ratio) return;
    captureNow();
    updateCropAdj({ ratio: id });
  };

  const handleReset = () => {
    captureNow();
    updateCropAdj({ ratio: 'original' });
  };

  return (
    <div className="crop-panel">
      {freeMode && (
        <div className="crop-panel__mode-badge">Free Mode</div>
      )}

      <div className="crop-panel__grid">
        {RATIOS.map((r) => (
          <button key={r.id}
            className={`crop-panel__ratio-btn ${ratio === r.id ? 'active' : ''}`}
            onClick={() => handleRatioSelect(r.id)}
            aria-pressed={ratio === r.id}
            aria-label={`Crop ${r.label}`}>
            <span className="crop-panel__ratio-icon">{r.icon}</span>
            <span className="crop-panel__ratio-label">{r.label}</span>
          </button>
        ))}
      </div>

      <div className="crop-panel__info">
        <span>Selected: <strong>{ratio}</strong></span>
        <button className="crop-panel__reset" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
