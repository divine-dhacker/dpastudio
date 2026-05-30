/**
 * useFabricCanvas.js
 *
 * Manages a native HTML5 <canvas> element.
 * Uses the 2D Canvas API (NOT Fabric.js) for this build so the
 * rendering path is simple, debuggable, and guaranteed to work on
 * every mobile browser without any CDN dependency.
 *
 * What this hook does:
 *  1. Keeps the <canvas> sized to its container via ResizeObserver.
 *  2. When currentImage changes, draws it centred + fitted inside
 *     the canvas with correct letterboxing.
 *  3. Applies rotation, flipH, flipV every redraw.
 *  4. Exposes exportDataURL() so the export modal can download.
 *  5. Exposes getHistogramData() for the Curves / Levels panels.
 *
 * The canvas element itself sits OVER a checkerboard <div> so the
 * "empty area" around the image shows the transparency grid.
 */

import { useEffect, useRef, useCallback } from 'react';
import useEditorStore from '../store/editorStore';

export function useImageCanvas(canvasRef, containerRef) {
  // Decoded HTMLImageElement we keep in a ref (no re-render needed)
  const imgElRef = useRef(null);

  const { currentImage, rotationAdj, zoom } = useEditorStore();

  // ── Core draw function ───────────────────────────────────────
  // Clears the canvas and paints imgElRef onto it with:
  //   • fit-to-canvas scaling (with optional zoom multiplier)
  //   • rotation (degrees)
  //   • horizontal / vertical flip
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgElRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const cW  = canvas.width;
    const cH  = canvas.height;

    // Clear to fully transparent so the checkerboard shows through
    ctx.clearRect(0, 0, cW, cH);

    const { angle = 0, flipH = false, flipV = false } = rotationAdj;
    const angleRad = (angle * Math.PI) / 180;

    // How much of the canvas the rotated image should fill
    const zoomFactor = zoom / 100;

    // Natural image size
    const iW = img.naturalWidth;
    const iH = img.naturalHeight;

    // Fit-scale: largest scale where the image fits inside the canvas
    const fitScale = Math.min(cW / iW, cH / iH) * 0.92;   // 0.92 = 4% margin
    const drawScale = fitScale * zoomFactor;

    const drawW = iW * drawScale;
    const drawH = iH * drawScale;

    ctx.save();

    // Translate to canvas centre, apply rotation, then flip
    ctx.translate(cW / 2, cH / 2);
    ctx.rotate(angleRad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Draw the image centred at origin
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }, [canvasRef, rotationAdj, zoom]);

  // ── Sync canvas size to container ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (!canvasRef.current) return;
      canvasRef.current.width  = Math.floor(width);
      canvasRef.current.height = Math.floor(height);
      redraw();
    });

    ro.observe(container);

    // Force an initial size immediately
    const { clientWidth: w, clientHeight: h } = container;
    if (canvasRef.current) {
      canvasRef.current.width  = w;
      canvasRef.current.height = h;
    }

    return () => ro.disconnect();
  }, [canvasRef, containerRef, redraw]);

  // ── Load / reload when currentImage changes ──────────────────
  useEffect(() => {
    if (!currentImage?.objectURL) {
      imgElRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imgElRef.current = img;
      redraw();
    };
    img.onerror = () => console.error('[useImageCanvas] Failed to decode:', currentImage.objectURL);
    img.src = currentImage.objectURL;
  }, [currentImage, canvasRef, redraw]);

  // ── Redraw whenever rotation or zoom changes ─────────────────
  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── Public API ────────────────────────────────────────────────

  /**
   * exportDataURL
   * Returns the current canvas content as a dataURL.
   * @param {string} format  'image/jpeg' | 'image/png' | 'image/webp'
   * @param {number} quality 0.0–1.0 (used for jpeg / webp)
   */
  const exportDataURL = useCallback((format = 'image/jpeg', quality = 0.92) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL(format, quality);
  }, [canvasRef]);

  /**
   * getHistogramData
   * Computes per-channel histograms from the current canvas pixels.
   * Returns { r, g, b, luma } each a Uint32Array[256], or null if
   * nothing is drawn.
   */
  const getHistogramData = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgElRef.current;
    if (!canvas || !img) return null;

    // Sample from an offscreen canvas at the image's native resolution
    const oc  = document.createElement('canvas');
    oc.width  = img.naturalWidth;
    oc.height = img.naturalHeight;
    const ctx = oc.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let data;
    try {
      data = ctx.getImageData(0, 0, oc.width, oc.height).data;
    } catch (e) {
      // Cross-origin taint — shouldn't happen with objectURLs but be safe
      console.warn('[getHistogramData] getImageData blocked:', e.message);
      return null;
    }

    const r    = new Uint32Array(256);
    const g    = new Uint32Array(256);
    const b    = new Uint32Array(256);
    const luma = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
      const ri = data[i];
      const gi = data[i + 1];
      const bi = data[i + 2];
      r[ri]++;
      g[gi]++;
      b[bi]++;
      luma[Math.round(0.2126 * ri + 0.7152 * gi + 0.0722 * bi)]++;
    }

    return { r, g, b, luma };
  }, [canvasRef]);

  return { redraw, exportDataURL, getHistogramData };
}

export default useImageCanvas;
