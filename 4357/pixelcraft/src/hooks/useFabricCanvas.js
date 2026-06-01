/**
 * useFabricCanvas.js  v2.1  — FIXED
 * =====================================================================
 * ROOT CAUSE OF THE BUG:
 *   useCallback captured colorAdj/rotationAdj/zoom/curvesState from
 *   Zustand at mount time. Because Zustand state reads inside
 *   useCallback don't create React re-render subscriptions, the closure
 *   went stale. Every slider drag changed the store but redraw() kept
 *   reading the original zeroed values.
 *
 * FIX:
 *   1. Each piece of state is subscribed individually via useEditorStore
 *      so React re-renders the hook owner on every change.
 *   2. redraw() reads ALL live values via useEditorStore.getState()
 *      at call time — guaranteed fresh on every invocation.
 *   3. A single useEffect with a combined deps-hash triggers redraw
 *      whenever any adjustment changes.
 * =====================================================================
 */

import { useEffect, useRef, useCallback } from 'react';
import useEditorStore from '../store/editorStore';

// ─────────────────────────────────────────────────────────────────────
//  PIXEL PIPELINE
// ─────────────────────────────────────────────────────────────────────

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function applyAdjustments(imageData, adj, curvesState) {
  const { data } = imageData;
  const len = data.length;

  const brightness = adj.brightness / 100;
  const contrast   = adj.contrast   / 100;
  const saturation = adj.saturation / 100;
  const warmth     = adj.warmth     / 100;
  const tint       = adj.tint       / 100;
  const vibrance   = adj.vibrance   / 100;
  const highlights = adj.highlights / 100;
  const shadows    = adj.shadows    / 100;
  const whites     = adj.whites     / 100;
  const blacks     = adj.blacks     / 100;
  const exposure   = adj.exposure   / 100;

  const luts    = buildCurveLUTs(curvesState);
  const cFactor = contrast > 0 ? 1 + contrast * 2.5 : 1 + contrast;

  for (let i = 0; i < len; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Exposure
    if (exposure !== 0) {
      const ef = Math.pow(2, exposure * 3);
      r = clamp(r * ef); g = clamp(g * ef); b = clamp(b * ef);
    }
    // Brightness
    if (brightness !== 0) {
      const bf = brightness * 128;
      r = clamp(r + bf); g = clamp(g + bf); b = clamp(b + bf);
    }
    // Contrast
    if (contrast !== 0) {
      r = clamp(((r / 255 - 0.5) * cFactor + 0.5) * 255);
      g = clamp(((g / 255 - 0.5) * cFactor + 0.5) * 255);
      b = clamp(((b / 255 - 0.5) * cFactor + 0.5) * 255);
    }
    // Saturation
    if (saturation !== 0) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sf   = 1 + saturation;
      r = clamp(gray + sf * (r - gray));
      g = clamp(gray + sf * (g - gray));
      b = clamp(gray + sf * (b - gray));
    }
    // Vibrance
    if (vibrance !== 0) {
      const maxC  = Math.max(r, g, b);
      const minC  = Math.min(r, g, b);
      const sat   = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const boost = vibrance * (1 - sat * 0.7);
      const gray  = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = clamp(gray + (1 + boost) * (r - gray));
      g = clamp(gray + (1 + boost) * (g - gray));
      b = clamp(gray + (1 + boost) * (b - gray));
    }
    // Warmth
    if (warmth !== 0) {
      r = clamp(r + warmth * 40);
      b = clamp(b - warmth * 40);
    }
    // Tint
    if (tint !== 0) {
      g = clamp(g + tint * 30);
    }
    // Highlights / Shadows
    if (highlights !== 0 || shadows !== 0) {
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (highlights !== 0) {
        const d = highlights * 80 * Math.max(0, luma * 2 - 1);
        r = clamp(r + d); g = clamp(g + d); b = clamp(b + d);
      }
      if (shadows !== 0) {
        const d = shadows * 80 * Math.max(0, 1 - luma * 2);
        r = clamp(r + d); g = clamp(g + d); b = clamp(b + d);
      }
    }
    // Whites
    if (whites !== 0) {
      const ws = 1 + whites * 0.5;
      r = clamp(((r / 255) ** (1 / ws)) * 255);
      g = clamp(((g / 255) ** (1 / ws)) * 255);
      b = clamp(((b / 255) ** (1 / ws)) * 255);
    }
    // Blacks
    if (blacks !== 0) {
      const bl = blacks * 30;
      r = clamp(r + bl); g = clamp(g + bl); b = clamp(b + bl);
    }
    // Curves LUTs
    if (luts) {
      if (luts.RGB) { r = luts.RGB[r]; g = luts.RGB[g]; b = luts.RGB[b]; }
      if (luts.R) r = luts.R[r];
      if (luts.G) g = luts.G[g];
      if (luts.B) b = luts.B[b];
    }

    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  return imageData;
}

function buildCurveLUTs(curvesState) {
  if (!curvesState) return null;
  const { points } = curvesState;
  const result = {};
  let hasNonIdentity = false;

  for (const ch of ['RGB', 'R', 'G', 'B']) {
    const pts = points[ch];
    const isId = pts.length === 2 &&
      pts[0].x === 0 && pts[0].y === 0 &&
      pts[1].x === 255 && pts[1].y === 255;
    if (isId) continue;
    hasNonIdentity = true;
    result[ch] = interpolateCurveLUT(pts);
  }
  return hasNonIdentity ? result : null;
}

function interpolateCurveLUT(points) {
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
    const h00 = 2*t**3-3*t**2+1, h10 = t**3-2*t**2+t;
    const h01 = -2*t**3+3*t**2,  h11 = t**3-t**2;
    const y   = h00*pts[seg].y + h10*dx*ts[seg] + h01*pts[seg+1].y + h11*dx*ts[seg+1];
    lut[x] = Math.max(0, Math.min(255, Math.round(y)));
  }
  return lut;
}

// ─────────────────────────────────────────────────────────────────────
//  HOOK
// ─────────────────────────────────────────────────────────────────────

export function useImageCanvas(canvasRef, containerRef) {
  const imgElRef = useRef(null);

  // ── Subscribe to EACH slice independently so React sees the change ──
  // This is the critical fix: individual selectors create separate
  // subscriptions, each causing a re-render when their value changes.
  const currentImage  = useEditorStore((s) => s.currentImage);
  const colorAdj      = useEditorStore((s) => s.colorAdj);
  const curvesState   = useEditorStore((s) => s.curvesState);
  const rotationAdj   = useEditorStore((s) => s.rotationAdj);
  const zoom          = useEditorStore((s) => s.zoom);
  const setCanvasSnapshot = useEditorStore((s) => s.setCanvasSnapshot);

  // ── Core draw — always reads from live state ────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgElRef.current;
    if (!canvas || !img) return;

    // Read FRESH state at draw time — never stale
    const state = useEditorStore.getState();
    const adj   = state.colorAdj;
    const rot   = state.rotationAdj;
    const z     = state.zoom;
    const curves = state.curvesState;

    const ctx = canvas.getContext('2d');
    const cW  = canvas.width;
    const cH  = canvas.height;

    ctx.clearRect(0, 0, cW, cH);

    const { angle = 0, flipH = false, flipV = false } = rot;
    const angleRad  = (angle * Math.PI) / 180;
    const iW        = img.naturalWidth;
    const iH        = img.naturalHeight;
    const fitScale  = Math.min(cW / iW, cH / iH) * 0.92;
    const drawScale = fitScale * (z / 100);
    const drawW     = iW * drawScale;
    const drawH     = iH * drawScale;

    const hasAdj = Object.values(adj).some((v) => v !== 0);
    const hasCurves = curves && (() => {
      for (const ch of ['RGB','R','G','B']) {
        const pts = curves.points[ch];
        if (!(pts.length === 2 && pts[0].x===0 && pts[0].y===0
              && pts[1].x===255 && pts[1].y===255)) return true;
      }
      return false;
    })();

    if (hasAdj || hasCurves) {
      const oc  = document.createElement('canvas');
      oc.width  = iW;
      oc.height = iH;
      const octx = oc.getContext('2d');
      octx.drawImage(img, 0, 0);
      let imageData = octx.getImageData(0, 0, iW, iH);
      imageData = applyAdjustments(imageData, adj, hasCurves ? curves : null);
      octx.putImageData(imageData, 0, 0);

      ctx.save();
      ctx.translate(cW / 2, cH / 2);
      ctx.rotate(angleRad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(oc, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(cW / 2, cH / 2);
      ctx.rotate(angleRad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // Snapshot for session persistence
    try {
      const snapScale = Math.min(1, 400 / Math.max(iW, iH));
      const sc = document.createElement('canvas');
      sc.width  = Math.round(iW * snapScale);
      sc.height = Math.round(iH * snapScale);
      sc.getContext('2d').drawImage(img, 0, 0, sc.width, sc.height);
      setCanvasSnapshot(sc.toDataURL('image/jpeg', 0.7));
    } catch { /* tainted canvas */ }

  }, [canvasRef, setCanvasSnapshot]);
  // NOTE: draw intentionally has a minimal dep list — it reads ALL live
  // state via getState() at call time, so it doesn't need them in deps.

  // ── ResizeObserver ──────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (!canvasRef.current) return;
      canvasRef.current.width  = Math.floor(width);
      canvasRef.current.height = Math.floor(height);
      draw();
    });
    ro.observe(container);
    const { clientWidth: w, clientHeight: h } = container;
    if (canvasRef.current) {
      canvasRef.current.width  = w;
      canvasRef.current.height = h;
    }
    return () => ro.disconnect();
  }, [canvasRef, containerRef, draw]);

  // ── Load image when currentImage changes ───────────────────────────
  useEffect(() => {
    if (!currentImage?.objectURL) {
      imgElRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const img  = new Image();
    img.onload = () => { imgElRef.current = img; draw(); };
    img.onerror = () => console.error('[useImageCanvas] Failed to decode image');
    img.src    = currentImage.objectURL;
  }, [currentImage, canvasRef, draw]);

  // ── THE KEY FIX: redraw whenever any adjustment changes ─────────────
  // These useEffects each subscribe to ONE store slice.
  // When a slider moves → Zustand updates colorAdj → React re-renders
  // → this effect fires → draw() reads fresh state via getState().
  useEffect(() => { draw(); }, [colorAdj, draw]);
  useEffect(() => { draw(); }, [rotationAdj, draw]);
  useEffect(() => { draw(); }, [zoom, draw]);
  useEffect(() => { draw(); }, [curvesState, draw]);

  // ── exportDataURL — full native resolution ──────────────────────────
  const exportDataURL = useCallback((format = 'image/jpeg', quality = 0.92) => {
    const img = imgElRef.current;
    if (!img) return null;

    const { colorAdj: adj, rotationAdj: rot, curvesState: curves } =
      useEditorStore.getState();

    const { angle = 0, flipH = false, flipV = false } = rot;
    const angleRad = (angle * Math.PI) / 180;
    const iW = img.naturalWidth, iH = img.naturalHeight;

    const oc  = document.createElement('canvas');
    oc.width  = iW; oc.height = iH;
    const ctx = oc.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const hasAdj = Object.values(adj).some((v) => v !== 0);
    if (hasAdj) {
      let imageData = ctx.getImageData(0, 0, iW, iH);
      imageData = applyAdjustments(imageData, adj, curves);
      ctx.putImageData(imageData, 0, 0);
    }

    const fc  = document.createElement('canvas');
    fc.width  = iW; fc.height = iH;
    const fctx = fc.getContext('2d');
    fctx.save();
    fctx.translate(iW / 2, iH / 2);
    fctx.rotate(angleRad);
    fctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    fctx.drawImage(oc, -iW / 2, -iH / 2);
    fctx.restore();

    return fc.toDataURL(format, quality);
  }, []);

  // ── getHistogramData ────────────────────────────────────────────────
  const getHistogramData = useCallback(() => {
    const img = imgElRef.current;
    if (!img) return null;

    const oc  = document.createElement('canvas');
    oc.width  = img.naturalWidth;
    oc.height = img.naturalHeight;
    const ctx = oc.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let data;
    try { data = ctx.getImageData(0, 0, oc.width, oc.height).data; }
    catch (e) { console.warn('[getHistogramData] blocked:', e.message); return null; }

    const r = new Uint32Array(256), g = new Uint32Array(256),
          b = new Uint32Array(256), luma = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
      const ri = data[i], gi = data[i+1], bi = data[i+2];
      r[ri]++; g[gi]++; b[bi]++;
      luma[Math.round(0.2126*ri + 0.7152*gi + 0.0722*bi)]++;
    }
    return { r, g, b, luma };
  }, []);

  return { redraw: draw, exportDataURL, getHistogramData };
}

export default useImageCanvas;
