/**
 * CropPanel.jsx
 * Aspect ratio selection grid matching the screenshot:
 * Original | 1:1 | 3:2 | 4:3 | 16:9 | 21:9 | ... | ✏ | ↙↗ | 🔒
 */

import React from 'react';
import useEditorStore from '../../store/editorStore';
import './CropPanel.css';

const RATIOS = [
  { id: 'original', label: 'Original' },
  { id: '1:1',      label: '1 : 1'   },
  { id: '3:2',      label: '3 : 2'   },
  { id: '4:3',      label: '4 : 3'   },
  { id: '16:9',     label: '16 : 9'  },
  { id: '21:9',     label: '21 : 9'  },
  { id: 'more',     label: '···'     },
  { id: 'custom',   label: '✏'       },
  { id: 'expand',   label: '↙↗'     },
  { id: 'lock',     label: '🔒'      },
];

export default function CropPanel() {
  const { cropState, updateCropState } = useEditorStore();
  const { ratio } = cropState;

  return (
    <div className="crop-panel">
      <div className="crop-panel__grid">
        {RATIOS.map((r) => (
          <button
            key={r.id}
            className={`btn crop-panel__ratio-btn ${ratio === r.id ? 'active' : ''}`}
            onClick={() => updateCropState({ ratio: r.id })}
            aria-pressed={ratio === r.id}
            aria-label={`Crop ratio ${r.label}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
