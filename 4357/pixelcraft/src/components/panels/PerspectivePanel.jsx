/**
 * PerspectivePanel.jsx  v2.1
 * Undo: captureNow() before activating any correction tool.
 */
import React from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './PerspectivePanel.css';

const PERSPECTIVE_TOOLS = [
  { id: 'perspective',    label: 'Perspective'    },
  { id: 'perspective_ii', label: 'Perspective II' },
  { id: 'lens',           label: 'Lens'           },
  { id: 'keystone',       label: 'Keystone'       },
];
const CORRECTION_TOOLS = [
  { id: 'temperature',    label: 'Temperature'    },
  { id: 'white_balance',  label: 'White Balance'  },
  { id: 'backlight',      label: 'Backlight'      },
  { id: 'perspective',    label: 'Perspective'    },
  { id: 'perspective_ii', label: 'Perspective II' },
  { id: 'lens',           label: 'Lens'           },
  { id: 'red_eye',        label: 'Red Eye'        },
  { id: 'whiten',         label: 'Whiten'         },
];

export default function PerspectivePanel({ correctionMode = false }) {
  const { perspectiveState, updatePerspectiveState } = useEditorStore();
  const { activeCorrection } = perspectiveState;
  const { captureNow } = useUndoSnapshot();
  const tools = correctionMode ? CORRECTION_TOOLS : PERSPECTIVE_TOOLS;

  const handleSelect = (id) => {
    if (id !== activeCorrection) captureNow();
    updatePerspectiveState({ activeCorrection: id });
  };

  return (
    <div className="perspective-panel">
      <div className="perspective-panel__grid">
        {tools.map((t) => (
          <button key={t.id}
            className={`perspective-panel__btn ${activeCorrection === t.id ? 'active' : ''}`}
            onClick={() => handleSelect(t.id)}
            aria-pressed={activeCorrection === t.id}>
            {t.label}
          </button>
        ))}
      </div>
      {correctionMode && (
        <p className="perspective-panel__hint">
          Select a correction tool, then adjust on canvas.
        </p>
      )}
    </div>
  );
}
