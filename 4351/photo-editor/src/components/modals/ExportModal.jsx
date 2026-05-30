/**
 * ExportModal.jsx
 * File format configuration dialog: JPEG quality, PNG, WebP.
 * Triggers download via canvas.toDataURL.
 */

import React, { useState } from 'react';
import useEditorStore from '../../store/editorStore';
import './ExportModal.css';

const FORMATS = ['JPEG', 'PNG', 'WebP'];

export default function ExportModal({ onExport }) {
  const { setShowExportModal, image } = useEditorStore();
  const [format,  setFormat]  = useState('JPEG');
  const [quality, setQuality] = useState(92);

  const handleExport = () => {
    if (onExport) onExport({ format: format.toLowerCase(), quality: quality / 100 });
    setShowExportModal(false);
  };

  return (
    <div
      className="export-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Export image"
      onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
    >
      <div className="export-modal__dialog">
        <header className="export-modal__header">
          <h2 className="export-modal__title">Export / Save</h2>
          <button
            className="icon-btn export-modal__close"
            onClick={() => setShowExportModal(false)}
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </header>

        {/* Format tabs */}
        <div className="export-modal__formats">
          {FORMATS.map((f) => (
            <button
              key={f}
              className={`btn export-modal__fmt-btn ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Quality slider (JPEG / WebP only) */}
        {format !== 'PNG' && (
          <div className="export-modal__quality-row">
            <span className="export-modal__quality-label">Quality</span>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              aria-label="Export quality"
            />
            <span className="export-modal__quality-value">{quality}%</span>
          </div>
        )}

        {/* File info */}
        <div className="export-modal__info">
          <span>{image.fileName || 'image'}</span>
          <span>{image.width} × {image.height} px</span>
        </div>

        {/* Actions */}
        <div className="export-modal__actions">
          <button
            className="btn export-modal__cancel"
            onClick={() => setShowExportModal(false)}
          >
            Cancel
          </button>
          <button
            className="btn export-modal__save active"
            onClick={handleExport}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
