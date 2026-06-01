/**
 * ExportModal.jsx
 * Format: JPEG / PNG / WebP
 * Quality slider (JPEG + WebP)
 * Downloads from the full-native-resolution canvas (not screen capture).
 */
import React, { useState } from 'react';
import useEditorStore from '../../store/editorStore';
import './ExportModal.css';

const FORMATS = [
  { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', hasQuality: true  },
  { id: 'png',  label: 'PNG',  mime: 'image/png',  hasQuality: false },
  { id: 'webp', label: 'WebP', mime: 'image/webp', hasQuality: true  },
];

const IcoClose    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const IcoDownload = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/></svg>;

function fmt(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ExportModal({ onExport, onClose }) {
  const { currentImage, setShowExportModal } = useEditorStore();
  const close = onClose ?? (() => setShowExportModal(false));

  const [formatId, setFormatId] = useState('jpeg');
  const [quality,  setQuality]  = useState(92);

  const activeFormat = FORMATS.find((f) => f.id === formatId);
  const baseName = (currentImage?.fileName ?? 'export').replace(/\.[^.]+$/, '');

  const handleSave = () => {
    if (onExport) {
      onExport({ format: formatId, quality: quality / 100 });
    }
    close();
  };

  return (
    <div className="export-modal__backdrop"
      role="dialog" aria-modal="true" aria-label="Export image"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>

      <div className="export-modal__dialog">

        {/* Header */}
        <header className="export-modal__header">
          <h2 className="export-modal__title">Export / Save</h2>
          <button className="export-modal__close" onClick={close} aria-label="Close">
            <IcoClose />
          </button>
        </header>

        {/* Format tabs */}
        <div className="export-modal__formats">
          {FORMATS.map((f) => (
            <button key={f.id}
              className={`export-modal__fmt-btn ${formatId === f.id ? 'active' : ''}`}
              onClick={() => setFormatId(f.id)}
              aria-pressed={formatId === f.id}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Quality slider */}
        {activeFormat?.hasQuality && (
          <div className="export-modal__quality-row">
            <span className="export-modal__quality-label">Quality</span>
            <input type="range" min={10} max={100} value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              aria-label="Export quality" />
            <span className="export-modal__quality-val">{quality}%</span>
          </div>
        )}

        {/* File info */}
        {currentImage && (
          <div className="export-modal__info">
            <div className="export-modal__info-row">
              <span className="export-modal__info-label">File</span>
              <span className="export-modal__info-val">
                {baseName}.{formatId}
              </span>
            </div>
            <div className="export-modal__info-row">
              <span className="export-modal__info-label">Dimensions</span>
              <span className="export-modal__info-val">
                {currentImage.width} × {currentImage.height} px
              </span>
            </div>
            <div className="export-modal__info-row">
              <span className="export-modal__info-label">Megapixels</span>
              <span className="export-modal__info-val">{currentImage.megapixels} MP</span>
            </div>
            {activeFormat?.hasQuality && (
              <div className="export-modal__info-row">
                <span className="export-modal__info-label">Format</span>
                <span className="export-modal__info-val">
                  {activeFormat.label} · {quality}% quality
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="export-modal__actions">
          <button className="export-modal__cancel" onClick={close}>Cancel</button>
          <button className="export-modal__save" onClick={handleSave}>
            <IcoDownload />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
