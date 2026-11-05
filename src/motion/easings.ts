/** Curvas de animação (sem dependência de tempo real — determinísticas). */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };

/** cubic-bezier(x1,y1,x2,y2) como no CSS. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; }
    return sy(clamp(t));
  };
}

export const ease = {
  linear: (t: number) => t,
  inOut: bezier(0.65, 0, 0.35, 1),        // movimento de câmera
  out: bezier(0.16, 1, 0.3, 1),           // entradas (expo-out suave)
  in: bezier(0.7, 0, 0.84, 0),            // saídas
  soft: bezier(0.45, 0.05, 0.25, 1),      // dolly cinematográfico
  luxe: bezier(0.83, 0, 0.17, 1),         // transições longas
  overshoot: bezier(0.34, 1.32, 0.64, 1), // overshoot mínimo
  quint: (t: number) => 1 - Math.pow(1 - clamp(t), 5),
};
