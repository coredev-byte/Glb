/**
 * Gráfico de colunas físicas: cada coluna nasce do piso (sem distorcer o bevel), tem tampa luminosa,
 * valor 3D com contagem e um conector espacial que liga os topos.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { clock } from '../engine/clock';
import { AnimatedNumber3D } from './AnimatedNumber3D';
import { textMaterials } from './Text3D';
import { clamp, ease } from '../motion/easings';

export interface BarDatum { label: string; value: number }
export interface BarChartProps {
  data: BarDatum[];
  spacing?: number; width?: number; maxHeight?: number; maxValue?: number;
  /** progresso de crescimento 0..1 por coluna */
  growFn: (i: number, t: number) => number;
  /** 0..1 — afunda a coluna de volta no piso (sumir) */
  sinkFn?: (i: number, t: number) => number;
  /** destaque (tampa/borda) por coluna 0..1 */
  highlightFn?: (i: number, t: number) => number;
  labelFn?: (i: number, t: number) => number; // presença do rótulo 0..1
  labelScaleFn?: (i: number, t: number) => number;
  connectorFn?: (t: number) => number;
  countT?: (i: number) => [number, number];
  /** posição x dinâmica por coluna (ex.: aproximar extremos) */
  xFn?: (i: number, t: number) => number;
  position?: [number, number, number];
}

export const barX = (i: number, n: number, spacing: number) => (i - (n - 1) / 2) * spacing;
export const barH = (v: number, maxV: number, maxH: number) => (v / maxV) * maxH;

export function BarChart3D({
  data, spacing = 0.62, width = 0.36, maxHeight = 2.6, maxValue, growFn, sinkFn, highlightFn, labelFn, labelScaleFn, connectorFn, countT, xFn, position,
}: BarChartProps) {
  const maxV = maxValue ?? Math.max(...data.map((d) => d.value));
  const n = data.length;
  const bars = useRef<THREE.Group[]>([]);
  const caps = useRef<THREE.MeshBasicMaterial[]>([]);
  const labels = useRef<THREE.Group[]>([]);
  const cols = useRef<THREE.Group[]>([]);
  const silver = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#B9BEC6', metalness: 1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12 }), []);
  const labelMat = useMemo(() => textMaterials.ice(), []);
  const heights = data.map((d) => barH(d.value, maxV, maxHeight));

  // conector: tubo que passa pelos topos
  const conn = useMemo(() => {
    const pts = data.map((d, i) => new THREE.Vector3(barX(i, n, spacing), barH(d.value, maxV, maxHeight) + 0.03, 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 200, 0.008, 8, false);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color('#F4F4F1') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uP; uniform vec3 uC; varying vec2 vUv; void main(){ if (vUv.x > uP) discard; float head = smoothstep(uP - 0.06, uP, vUv.x); gl_FragColor = vec4(uC * (1.2 + head * 2.0), 0.85); }',
    });
    return { geo, mat };
  }, [data, n, spacing, maxV, maxHeight]);

  useFrame(() => {
    const t = clock.t;
    data.forEach((_, i) => {
      const g = growFn(i, t), s = sinkFn ? sinkFn(i, t) : 0;
      const h = heights[i];
      const b = bars.current[i];
      if (!b) return;
      if (xFn) cols.current[i].position.x = xFn(i, t);
      // a coluna inteira existe; ela sobe do piso (y negativo fica escondido sob o piso refletivo)
      b.position.y = -h * (1 - g) - (h + 0.1) * s;
      b.visible = g > 0.001 && s < 0.999;
      const hl = highlightFn ? highlightFn(i, t) : 0;
      caps.current[i].opacity = clamp(0.25 + hl * 0.75) * (g > 0.98 ? 1 : g);
      const lab = labels.current[i];
      const lo = labelFn ? labelFn(i, t) : 1;
      const k = ease.out(clamp((g - 0.6) / 0.4)) * lo * (1 - s);
      lab.visible = k > 0.01;
      lab.scale.setScalar((0.85 + 0.15 * k) * (labelScaleFn ? labelScaleFn(i, t) : 1));
      lab.position.y = h + 0.14 + (1 - k) * 0.08 - (h + 0.4) * s;
    });
    conn.mat.uniforms.uP.value = connectorFn ? connectorFn(t) : 0;
  });

  return (
    <group position={position}>
      {data.map((d, i) => (
        <group key={i} ref={(el) => { if (el) cols.current[i] = el; }} position-x={barX(i, n, spacing)}>
          <group ref={(el) => { if (el) bars.current[i] = el; }}>
            <RoundedBox args={[width, heights[i], width]} radius={0.018} smoothness={3} material={silver} position-y={heights[i] / 2} castShadow />
            <mesh position-y={heights[i] + 0.002} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[width - 0.03, width - 0.03]} />
              <meshBasicMaterial ref={(el) => { if (el) caps.current[i] = el; }} color="#F4F4F1" transparent toneMapped={false} />
            </mesh>
          </group>
          <group ref={(el) => { if (el) labels.current[i] = el; }}>
            <AnimatedNumber3D to={d.value} t0={countT ? countT(i)[0] : 0} t1={countT ? countT(i)[1] : 0.01} format="brl-nosym"
              size={0.115} weight="bold" depth={0.05} bevel={0.004} material={labelMat} />
          </group>
        </group>
      ))}
      <mesh geometry={conn.geo} material={conn.mat} />
    </group>
  );
}
