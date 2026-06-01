/**
 * CurvesPanel.jsx  v2.1
 * Undo integration:
 *   - captureBeforeDrag() fires on pointerdown before point move/add.
 *   - endDrag() fires on pointerup.
 *   - Point delete (dblclick) and channel reset fire captureNow() first.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import useEditorStore from '../../store/editorStore';
import { useUndoSnapshot } from '../../hooks/useUndoSnapshot';
import './CurvesPanel.css';

const CHANNELS = ['RGB', 'R', 'G', 'B'];
const CH_COLOR  = { RGB: '#cccccc', R: '#e53935', G: '#43a047', B: '#1e88e5' };

/* ── Monotone cubic → Uint8Array[256] LUT ─────────────────────── */
function buildLUT(points) {
  const pts = [...points].sort((a, b) => a.x - b.x);
  const n   = pts.length;
  if (n < 2) return null;

  const ms = [];
  for (let i = 0; i < n - 1; i++)
    ms.push((pts[i+1].y - pts[i].y) / (pts[i+1].x - pts[i].x || 0.001));

  const ts = [ms[0]];
  for (let i = 1; i < n - 1; i++) ts.push((ms[i-1] + ms[i]) / 2);
  ts.push(ms[n-2]);

  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    let seg = n - 2;
    for (let i = 0; i < n - 1; i++) { if (x <= pts[i+1].x) { seg = i; break; } }
    const dx  = pts[seg+1].x - pts[seg].x || 0.001;
    const t   = (x - pts[seg].x) / dx;
    const h00 = 2*t**3 - 3*t**2 + 1, h10 = t**3 - 2*t**2 + t;
    const h01 = -2*t**3 + 3*t**2,    h11 = t**3 - t**2;
    const y   = h00*pts[seg].y + h10*dx*ts[seg] + h01*pts[seg+1].y + h11*dx*ts[seg+1];
    lut[x] = Math.max(0, Math.min(255, Math.round(y)));
  }
  return lut;
}

function drawHistogram(ctx, histData, W, H) {
  if (!histData) return;
  const { r, g, b, luma } = histData;
  const maxVal = Math.max(...r, ...g, ...b, ...luma, 1);

  ctx.globalCompositeOperation = 'screen';
  [
    { data: r,    color: 'rgba(220,60,60,0.55)'   },
    { data: g,    color: 'rgba(60,180,60,0.55)'   },
    { data: b,    color: 'rgba(60,100,220,0.55)'  },
    { data: luma, color: 'rgba(180,180,180,0.35)' },
  ].forEach(({ data, color }) => {
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * W;
      const y = H - (data[i] / maxVal) * H * 0.88;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

export default function CurvesPanel({ histogramData }) {
  const {
    curvesState, setCurvesChannel, setCurvesPoints, resetCurvesChannel,
  } = useEditorStore();
  const { channel, points } = curvesState;
  const currentPoints = points[channel];

  const { captureNow, captureBeforeDrag, endDrag } = useUndoSnapshot();

  const canvasRef  = useRef(null);
  const draggingRef = useRef(null);

  /* ── Draw ──────────────────────────────────────────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(0, 0, W, H);

    /* Grid */
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = (i/4)*W, y = (i/4)*H;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }

    /* Diagonal reference */
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,0); ctx.stroke();
    ctx.setLineDash([]);

    /* Histogram */
    drawHistogram(ctx, histogramData, W, H);

    /* Curve */
    const sorted = [...currentPoints].sort((a,b) => a.x - b.x);
    const lut    = sorted.length >= 2 ? buildLUT(sorted) : null;

    ctx.strokeStyle = CH_COLOR[channel];
    ctx.lineWidth   = 2;
    ctx.beginPath();
    if (lut) {
      for (let i = 0; i < 256; i++) {
        const px = (i/255)*W, py = H - (lut[i]/255)*H;
        i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
    }
    ctx.stroke();

    /* Control point handles */
    sorted.forEach((pt) => {
      const px = (pt.x/255)*W, py = H - (pt.y/255)*H;
      ctx.beginPath(); ctx.arc(px,py,7,0,Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
      ctx.strokeStyle = CH_COLOR[channel]; ctx.lineWidth = 2; ctx.stroke();
    });
  }, [currentPoints, channel, histogramData]);

  useEffect(() => { draw(); }, [draw]);

  /* ── Pointer helpers ───────────────────────────────────────── */
  const toCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx   = e.clientX ?? e.touches?.[0]?.clientX;
    const cy   = e.clientY ?? e.touches?.[0]?.clientY;
    return {
      x: Math.round(((cx - rect.left)  / rect.width)  * 255),
      y: Math.round((1 - (cy - rect.top) / rect.height) * 255),
    };
  };

  const nearestIdx = (cx, cy, thresh = 14) => {
    const c = canvasRef.current;
    return currentPoints.findIndex((pt) => {
      const dx = ((pt.x/255)*c.width)  - ((cx/255)*c.width);
      const dy = ((1-pt.y/255)*c.height) - ((1-cy/255)*c.height);
      return Math.hypot(dx, dy) <= thresh;
    });
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    captureBeforeDrag();                          // ← undo snapshot
    const { x, y } = toCoords(e);
    const idx = nearestIdx(x, y);
    if (idx !== -1) {
      draggingRef.current = { index: idx };
    } else {
      const newPts = [...currentPoints, { x, y: Math.max(0, Math.min(255, y)) }];
      setCurvesPoints(channel, newPts);
      draggingRef.current = { index: newPts.length - 1 };
    }
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const { x, y } = toCoords(e);
    const idx = draggingRef.current.index;
    setCurvesPoints(channel, currentPoints.map((pt, i) =>
      i === idx
        ? { x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) }
        : pt
    ));
  };

  const onPointerUp = () => {
    draggingRef.current = null;
    endDrag();                                    // ← reset drag guard
  };

  const onDblClick = (e) => {
    const { x, y } = toCoords(e);
    const idx = nearestIdx(x, y);
    if (idx !== -1 && currentPoints.length > 2) {
      captureNow();                               // ← undo before delete
      setCurvesPoints(channel, currentPoints.filter((_, i) => i !== idx));
    }
  };

  const handleReset = () => {
    captureNow();                                 // ← undo before reset
    resetCurvesChannel(channel);
  };

  return (
    <div className="curves-panel">
      {/* Channel tabs */}
      <div className="curves-panel__tabs">
        {CHANNELS.map((ch) => (
          <button key={ch}
            className={`curves-panel__tab ${channel === ch ? 'active' : ''}`}
            style={channel === ch ? { color: CH_COLOR[ch], borderBottomColor: CH_COLOR[ch] } : {}}
            onClick={() => setCurvesChannel(ch)}>
            {ch}
          </button>
        ))}
        <button className="curves-panel__tab-icon" title="Reset channel"
          onClick={handleReset}>↺</button>
      </div>

      {/* Canvas */}
      <div className="curves-panel__canvas-wrap">
        <canvas ref={canvasRef} className="curves-panel__canvas"
          width={256} height={256}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}    onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}   onDoubleClick={onDblClick}
          aria-label={`${channel} curve`} />
      </div>

      <p className="curves-panel__hint">
        Click to add · Drag to move · Double-click to remove
      </p>
    </div>
  );
}
