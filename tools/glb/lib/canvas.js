// Utilitários de textura procedural (Canvas 2D) — determinísticos (PRNG com seed).
import * as THREE from 'three';

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function toTexture(canvas, { srgb = true, mime = 'image/png', repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.userData.mimeType = mime;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Converte um canvas de altura (luminância = altura) em normal map tangent-space. */
export function heightToNormal(heightCanvas, strength = 2.0, wrap = false) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const H = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) H[i] = src[i * 4] / 255;
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const at = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.min(w - 1, Math.max(0, x)); y = Math.min(h - 1, Math.max(0, y)); }
    return H[y * w + x];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // canvas y desce; em UV (flipY) o v sobe -> inverte dy
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Desenha texto com tracking (letter-spacing) centralizado em x. */
export function trackedText(ctx, text, cx, y, tracking) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + tracking; });
  return total;
}

/** Ajusta o tamanho da fonte para o texto (com tracking relativo) caber em `width`. */
export function fitFont(ctx, text, family, weight, width, trackingEm, style = '') {
  let size = 400;
  ctx.font = `${style} ${weight} ${size}px ${family}`;
  const chars = [...text];
  const raw = chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + trackingEm * size * (chars.length - 1);
  size = size * width / raw;
  ctx.font = `${style} ${weight} ${size}px ${family}`;
  return { size, tracking: trackingEm * size };
}
