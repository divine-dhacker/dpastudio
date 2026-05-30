/**
 * CurvesPanel.jsx
 * Interactive RGB Curves panel.
 * Features:
 *  - Channel tabs: RGB / R / G / B / ★ (presets) / ≡ (options)
 *  - Draggable control points on a 256×256 spline canvas
 *  - Live RGB histogram drawn behind the curve
 *  - Points are draggable; double-click removes a point; click on curve adds one
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import useEditorStore from '../../store/editorStore';
import './CurvesPanel.css';

const CHANNELS = ['RGB', 'R', 'G', 'B'];
const CHANNEL_COLORS = {
  RGB: '#cccccc',
  R:   '#e53935',
  G:   '#43a047',
  B:   '#1e88e5',
};

const CURVE_SIZE = 256; // logical curve grid size

// ── Monotone cubic interpolation ──────────────────────────────
function interpolateCurve(points) {
  if (points.length < 2) return points;

  // Ensure sorted by x
  const pts = [...points].sort((a, b) => a.x - b.x);
  const n   = pts.length;

  // Compute slopes
  const ms = [];
  for (let i = 0; i < n - 1; i++) {
    ms.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
  }

  const ts = [ms[0]];
  for (let i = 1; i < n - 1; i++) {
    ts.push((ms[i - 1] + ms[i]) / 2);
  }
  ts.push(ms[n - 2]);

  // Build LUT [0..255]
  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    // Find segment
    let seg = n - 2;
    for (let i = 0; i < n - 1; i++) {
      if (x <= pts[i + 1].x) { seg = i; break; }
    }
    const t = (x - pts[seg].x) / (pts[seg + 1].x - pts[seg].x || 1);
    const h00 = 2*t**3 - 3*t**2 + 1;
    const h10 = t**3 - 2*t**2 + t;
    const h01 = -2*t**3 + 3*t**2;
    const h11 = t**3 - t**2;
    const dx  = pts[seg + 1].x - pts[seg].x;
    const y   = h00*pts[seg].y + h10*dx*ts[seg] + h01*pts[seg+1].y + h11*dx*ts[seg+1];
    lut[x] = Math.max(0, Math.min(255, Math.round(y)));
  }
  return lut;
}

// ── Histogram draw helper ──────────────────────────────────────
function drawHistogram(ctx, histData, w, h) {
  if (!histData) return;
  const { r, g, b, luma } = histData;

  const maxVal = Math.max(
    ...r, ...g, ...b, ...luma
  );

  ctx.globalCompositeOperation = 'screen';

  const channels = [
    { data: r,    color: 'rgba(220,60,60,0.7)'  },
    { data: g,    color: 'rgba(60,180,60,0.7)'  },
    { data: b,    color: 'rgba(60,100,220,0.7)' },
    { data: luma, color: 'rgba(180,180,180,0.4)'},
  ];

  channels.forEach(({ data, color }) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w;
      const y = h - (data[i] / maxVal) * h * 0.9;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });

  ctx.globalCompositeOperation = 'source-over';
}

// ── Main Component ─────────────────────────────────────────────
export default function CurvesPanel({ histogramData }) {
  const { curvesState, setCurvesChannel, setCurvesPoints } = useEditorStore();
  const { channel, points } = curvesState;

  const canvasRef   = useRef(null);
  const dragging    = useRef(null);  // { index: number }

  const currentPoints = points[channel];

  // ── Draw to canvas ────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: W, height: H } = canvas;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const x = (i / 4) * W;
      const y = (i / 4) * H;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, 0); ctx.stroke();

    // Histogram
    drawHistogram(ctx, histogramData, W, H);

    // Curve spline
    const sorted = [...currentPoints].sort((a, b) => a.x - b.x);
    const lut    = sorted.length >= 2 ? interpolateCurve(sorted) : null;

    ctx.strokeStyle = CHANNEL_COLORS[channel];
    ctx.lineWidth   = 2;
    ctx.beginPath();

    if (lut) {
      for (let i = 0; i < 256; i++) {
        const px = (i / 255) * W;
        const py = H - (lut[i] / 255) * H;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    } else {
      const p0 = sorted[0];
      ctx.moveTo((p0.x / 255) * W, H - (p0.y / 255) * H);
    }
    ctx.stroke();

    // Control point handles
    sorted.forEach((pt, idx) => {
      const px = (pt.x / 255) * W;
      const py = H - (pt.y / 255) * H;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.strokeStyle = CHANNEL_COLORS[channel];
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [currentPoints, channel, histogramData]);

  useEffect(() => { draw(); }, [draw]);

  // ── Pointer events ────────────────────────────────────────────
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    return {
      x: Math.round(((cx - rect.left) / rect.width)  * 255),
      y: Math.round((1 - (cy - rect.top) / rect.height) * 255),
    };
  };

  const findNearestPoint = (cx, cy, threshold = 12) => {
    const canvas = canvasRef.current;
    const { width: W, height: H } = canvas;
    const px = (cx / 255) * W;
    const py = H - (cy / 255) * H;

    return currentPoints.findIndex((pt) => {
      const dx = (pt.x / 255) * W - px;
      const dy = H - (pt.y / 255) * H - py;
      return Math.sqrt(dx*dx + dy*dy) <= threshold;
    });
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const idx = findNearestPoint(x, y);

    if (idx !== -1) {
      dragging.current = { index: idx };
    } else {
      // Add new point
      const newPts = [...currentPoints, { x, y: Math.max(0, Math.min(255, y)) }];
      setCurvesPoints(channel, newPts);
      dragging.current = { index: newPts.length - 1 };
    }
  };

  const handlePointerMove = (e) => {
    if (dragging.current === null) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const idx = dragging.current.index;
    const newPts = currentPoints.map((pt, i) =>
      i === idx
        ? { x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) }
        : pt
    );
    setCurvesPoints(channel, newPts);
  };

  const handlePointerUp = () => { dragging.current = null; };

  const handleDoubleClick = (e) => {
    const { x, y } = getCanvasCoords(e);
    const idx = findNearestPoint(x, y);
    if (idx !== -1 && currentPoints.length > 2) {
      setCurvesPoints(channel, currentPoints.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="curves-panel">
      {/* ── Channel tabs ── */}
      <div className="curves-panel__channels">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            className={`btn curves-panel__ch-btn ${channel === ch ? 'active' : ''}`}
            onClick={() => setCurvesChannel(ch)}
            aria-pressed={channel === ch}
          >
            {ch}
          </button>
        ))}
        <button className="icon-btn curves-panel__ch-btn" aria-label="Presets">★</button>
        <button className="icon-btn curves-panel__ch-btn" aria-label="Options">≡</button>
      </div>

      {/* ── Curve canvas ── */}
      <div className="curves-panel__canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="curves-panel__canvas"
          width={256}
          height={256}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          aria-label={`${channel} curve adjustment`}
        />
      </div>
    </div>
  );
}
