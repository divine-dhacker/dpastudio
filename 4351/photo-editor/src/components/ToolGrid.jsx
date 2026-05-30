/**
 * ToolGrid.jsx
 * The 2-column grid of all editing tools.
 * Matches the screenshot layout: Color | Curves, Levels | Effect, etc.
 * Selecting a tool updates the Zustand activePanel and renders the
 * corresponding panel component adjacent (desktop) or below (mobile).
 */

import React from 'react';
import useEditorStore, { PANELS } from '../store/editorStore';
import './ToolGrid.css';

// ── Tool definitions ──────────────────────────────────────────
// Order matches the screenshots exactly.
const TOOLS = [
  { id: PANELS.COLOR,       label: 'Color'       },
  { id: PANELS.CURVES,      label: 'Curves'      },
  { id: PANELS.LEVELS,      label: 'Levels'      },
  { id: PANELS.EFFECT,      label: 'Effect'      },
  { id: PANELS.EFFECT_II,   label: 'Effect II'   },
  { id: PANELS.FRAME,       label: 'Frame'       },
  { id: PANELS.CORRECTION,  label: 'Correction'  },
  { id: PANELS.DENOISE,     label: 'Denoise'     },
  { id: PANELS.DRAWING,     label: 'Drawing'     },
  { id: PANELS.PIXEL,       label: 'Pixel'       },
  { id: PANELS.CLONE,       label: 'Clone'       },
  { id: PANELS.CUT_OUT,     label: 'Cut Out'     },
  { id: PANELS.TEXT_SHAPE,  label: 'Text/Image'  },
  { id: PANELS.ROTATION,    label: 'Rotation'    },
  { id: PANELS.STRAIGHTEN,  label: 'Straighten'  },
  { id: PANELS.CROP,        label: 'Crop'        },
  { id: PANELS.CROP_FREE,   label: 'Crop (Free)' },
  { id: PANELS.RESIZE,      label: 'Resize'      },
  { id: PANELS.FIT,         label: 'Fit'         },
  { id: PANELS.PERSPECTIVE, label: 'Perspective' },
];

// ── Component ─────────────────────────────────────────────────
export default function ToolGrid() {
  const { activePanel, setActivePanel } = useEditorStore();

  return (
    <nav className="tool-grid" aria-label="Editing tools">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`tool-grid__btn btn ${activePanel === tool.id ? 'active' : ''}`}
          onClick={() => setActivePanel(tool.id)}
          aria-pressed={activePanel === tool.id}
          aria-label={tool.label}
        >
          {tool.label}
        </button>
      ))}
    </nav>
  );
}
