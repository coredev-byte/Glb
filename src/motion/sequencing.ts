import { clamp, ease, invLerp } from './easings';

type Ease = (t: number) => number;

/** Progresso eased de um intervalo [a,b] (segundos). */
export const seg = (t: number, a: number, b: number, e: Ease = ease.out) => e(invLerp(a, b, t));

/** Envelope entra/sai: sobe em [a, a+inD], fica em 1, desce em [b-outD, b]. */
export const window01 = (t: number, a: number, b: number, inD = 0.4, outD = 0.4, eIn: Ease = ease.out, eOut: Ease = ease.in) => {
  if (t < a || t > b) return 0;
  const i = inD > 0 ? eIn(clamp((t - a) / inD)) : 1;
  const o = outD > 0 ? 1 - eOut(clamp((t - (b - outD)) / outD)) : 1;
  return Math.min(i, o);
};

/** Keyframes [tempo, valor] com easing por trecho. */
export function keys<T extends number | number[]>(t: number, frames: [number, T, Ease?][]): T {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, v0] = frames[i];
    const [t1, v1, e = ease.inOut] = frames[i + 1];
    if (t <= t1) {
      const u = e(invLerp(t0, t1, t));
      if (typeof v0 === 'number') return (v0 + ((v1 as number) - v0) * u) as T;
      return (v0 as number[]).map((x, k) => x + ((v1 as number[])[k] - x) * u) as T;
    }
  }
  return frames[frames.length - 1][1];
}

/** PRNG determinístico (mulberry32). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
