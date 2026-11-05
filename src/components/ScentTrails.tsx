/**
 * Rastros de fragrância: filamentos emissivos finos em curvas suaves, desenhados progressivamente.
 * Movimento procedural determinístico (função do relógio global) — nada de fumaça genérica.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { clock } from '../engine/clock';
import { rng } from '../motion/sequencing';

export interface TrailsProps {
  count?: number; seed?: number; radius?: number; height?: number; turns?: number; thickness?: number;
  colorA?: string; colorB?: string;
  /** progresso de desenho 0..1 */
  progressFn: (t: number) => number;
  /** opacidade global 0..1 */
  alphaFn?: (t: number) => number;
  origin?: [number, number, number];
}

export function ScentTrails({
  count = 9, seed = 3, radius = 0.6, height = 1.6, turns = 1.4, thickness = 0.0035,
  colorA = '#CDD0D5', colorB = '#B78C57', progressFn, alphaFn, origin = [0, 0, 0],
}: TrailsProps) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, (_, k) => {
      const pts: THREE.Vector3[] = [];
      const ph = r() * Math.PI * 2, rad = radius * (0.55 + r() * 0.6), h = height * (0.6 + r() * 0.5), tw = turns * (0.7 + r() * 0.6);
      const wob = 0.05 + r() * 0.12;
      for (let i = 0; i <= 64; i++) {
        const u = i / 64;
        const a = ph + u * tw * Math.PI * 2;
        const rr = rad * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.1))) + Math.sin(u * 9 + ph) * wob;
        pts.push(new THREE.Vector3(Math.cos(a) * rr, u * h, Math.sin(a) * rr));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 220, thickness * (0.6 + r() * 0.8), 6, false);
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        uniforms: {
          uP: { value: 0 }, uA: { value: 1 }, uT: { value: 0 }, uOff: { value: r() * 0.25 },
          uCA: { value: new THREE.Color(colorA) }, uCB: { value: new THREE.Color(colorB) }, uMix: { value: r() },
        },
        vertexShader: `uniform float uT; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position;
          p.x += sin(uT * 0.7 + p.y * 3.0) * 0.03 * p.y; p.z += cos(uT * 0.6 + p.y * 2.5) * 0.03 * p.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
        fragmentShader: `uniform float uP; uniform float uA; uniform float uOff; uniform vec3 uCA; uniform vec3 uCB; uniform float uMix; varying vec2 vUv;
          void main(){ float p = clamp(uP * 1.25 - uOff, 0.0, 1.0); if (vUv.x > p) discard;
            float tail = smoothstep(0.0, 0.35, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
            float head = smoothstep(p - 0.08, p, vUv.x);
            vec3 c = mix(uCA, uCB, clamp(vUv.x * 0.8 + uMix * 0.4, 0.0, 1.0));
            gl_FragColor = vec4(c * (0.32 + head * 0.9) * tail * uA, 1.0); }`,
      });
      return { geo, mat };
    });
  }, [count, seed, radius, height, turns, thickness, colorA, colorB]);
  useFrame(() => {
    const t = clock.t;
    const p = progressFn(t), a = alphaFn ? alphaFn(t) : 1;
    items.forEach((it) => { it.mat.uniforms.uP.value = p; it.mat.uniforms.uA.value = a; it.mat.uniforms.uT.value = t; });
  });
  return (
    <group position={origin}>
      {items.map((it, i) => <mesh key={i} geometry={it.geo} material={it.mat} frustumCulled={false} />)}
    </group>
  );
}

/** Ondas circulares tridimensionais (impacto da gota) — filamentos, não fumaça. */
export function Ripples({ t0, count = 5, maxR = 1.8, color = '#D9B47C', position }: { t0: number; count?: number; maxR?: number; color?: string; position?: [number, number, number] }) {
  const rings = useMemo(() => Array.from({ length: count }, (_, i) => {
    const geo = new THREE.TorusGeometry(1, 0.006, 6, 160);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geo, mat, delay: i * 0.22 };
  }), [count, color]);
  const refs: THREE.Mesh[] = [];
  useFrame(() => {
    const t = clock.t - t0;
    rings.forEach((r, i) => {
      const m = refs[i];
      if (!m) return;
      const u = (t - r.delay) / 2.4;
      m.visible = u > 0 && u < 1;
      if (!m.visible) return;
      const e = 1 - Math.pow(1 - u, 2.2);
      m.scale.set(0.02 + e * maxR, 0.02 + e * maxR, 1 + e * 2);
      m.position.y = Math.sin(u * Math.PI) * 0.04 * (i % 2 ? 1 : -1);
      r.mat.opacity = (1 - u) * (1 - u) * 1.4;
    });
  });
  return (
    <group position={position}>
      {rings.map((r, i) => <mesh key={i} ref={(el) => { if (el) refs[i] = el; }} geometry={r.geo} material={r.mat} rotation-x={Math.PI / 2} />)}
    </group>
  );
}
