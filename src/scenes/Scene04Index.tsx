/** CENA 04 — "R$ 200,49 DE DIFERENÇA" / "+100,5%". Só restam os extremos; o intervalo vira uma cota física. */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BarChart3D } from '../components/BarChart3D';
import { AnimatedNumber3D } from '../components/AnimatedNumber3D';
import { Text3D, textMaterials } from '../components/Text3D';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector, useSceneFrame } from './common';
import { CHART, chartData, colTop, CHART_N, barX } from './Scene03Comparison';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { keys } from '../motion/sequencing';
import { clamp, ease, lerp } from '../motion/easings';
import { pricingStats } from '../config/pricing-data';
import { clock } from '../engine/clock';

const t0 = T('s04');
const GAP_X = 0.62;                      // posição final dos extremos (±)
const MIN_TOP = colTop(0), MAX_TOP = colTop(CHART_N - 1);
export const NUM_SIZE = 0.26;
export const NUM_POS: [number, number, number] = [0, MAX_TOP + 0.4, 0.3];
const RING_Y = (MIN_TOP + MAX_TOP) / 2;
const BRACKET_X = GAP_X - CHART.width / 2 - 0.08;

registerShot('s04', (lt): Pose => {
  const push = ease.luxe(clamp(lt / 1.5));
  const orbit = ease.soft(clamp((lt - 1.4) / 3.1));
  const ang = orbit * 0.3;
  const dist = lerp(10.9, 5.9, push);
  const ty = lerp(1.12, 2.0, push);
  return {
    pos: [Math.sin(ang) * dist, lerp(1.72, 1.95, push) + orbit * 0.1, Math.cos(ang) * dist], target: [0, ty, 0.2],
    fov: lerp(38, 40, push), focus: dist, focusRange: 1.6, bokeh: keys(lt, [[0, 0.4], [1.6, 1.4]]),
  };
});

/** Linha luminosa desenhada progressivamente entre dois pontos. */
function GlowSegment({ a, b, t1, t2, r = 0.007, color = '#fffaf0', dashed = false }: { a: THREE.Vector3; b: THREE.Vector3; t1: number; t2: number; r?: number; color?: string; dashed?: boolean }) {
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 48, r, 8, false);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(color) }, uD: { value: dashed ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uP; uniform vec3 uC; uniform float uD; varying vec2 vUv;
        void main(){ if (vUv.x > uP) discard; if (uD > 0.5 && fract(vUv.x * 22.0) > 0.55) discard;
          float h = smoothstep(uP - 0.1, uP, vUv.x); gl_FragColor = vec4(uC * (1.3 + h * 2.0), 1.0); }`,
    });
    return { geo, mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFrame(() => { mat.uniforms.uP.value = ease.inOut(clamp((clock.t - t1) / (t2 - t1))); });
  return <mesh geometry={geo} material={mat} />;
}

/** Cota: linha de nível do menor preço + colchete vertical até o maior. */
function Dimension() {
  const y0 = MIN_TOP + 0.02, y1 = MAX_TOP + 0.02, xl = -GAP_X + CHART.width / 2 + 0.03, xb = BRACKET_X;
  return (
    <group>
      <GlowSegment a={new THREE.Vector3(xl, y0, 0)} b={new THREE.Vector3(GAP_X - CHART.width / 2 - 0.02, y0, 0)} t1={t0 + 1.0} t2={t0 + 1.5} dashed r={0.005} />
      <GlowSegment a={new THREE.Vector3(xb, y0, 0)} b={new THREE.Vector3(xb, y1, 0)} t1={t0 + 1.35} t2={t0 + 1.9} r={0.007} />
      <GlowSegment a={new THREE.Vector3(xb - 0.06, y0, 0)} b={new THREE.Vector3(xb + 0.06, y0, 0)} t1={t0 + 1.3} t2={t0 + 1.4} r={0.007} />
      <GlowSegment a={new THREE.Vector3(xb - 0.06, y1, 0)} b={new THREE.Vector3(xb + 0.06, y1, 0)} t1={t0 + 1.85} t2={t0 + 1.95} r={0.007} />
    </group>
  );
}

/** Anel indicador da variação percentual (100% = volta completa; o excedente aparece como um segmento âmbar). */
function PercentRing() {
  const group = useRef<THREE.Group>(null!);
  const R = 0.27;
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uP: { value: 0 }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uP; uniform float uA; varying vec2 vUv;
      void main(){ float a = 1.0 - vUv.x; if (a > uP) discard; gl_FragColor = vec4(vec3(0.80, 0.82, 0.84) * 1.5, uA); }`,
  }), []);
  const extra = useMemo(() => new THREE.MeshBasicMaterial({ color: '#E6C08A', toneMapped: false, transparent: true }), []);
  const track = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3a3e46', transparent: true, opacity: 0.6, toneMapped: false }), []);
  const pctMat = useMemo(() => textMaterials.ice(), []);
  const pctExtra = (pricingStats.pct - 100) / 100;
  useSceneFrame('s04', (lt) => {
    const k = ease.out(clamp((lt - 2.85) / 0.5));
    group.current.visible = lt > 2.8;
    group.current.scale.setScalar(0.85 + 0.15 * k);
    mat.uniforms.uA.value = k;
    track.opacity = 0.6 * k;
    mat.uniforms.uP.value = ease.inOut(clamp((lt - 2.9) / 0.9));
    extra.opacity = clamp((lt - 3.75) / 0.2);
  });
  return (
    <group ref={group} position={[-0.06, RING_Y, 0.05]}>
      <mesh material={track}><torusGeometry args={[R, 0.005, 8, 160]} /></mesh>
      <mesh material={mat} rotation-z={Math.PI / 2} scale-x={-1}><torusGeometry args={[R, 0.012, 10, 200]} /></mesh>
      <mesh material={extra} rotation-z={Math.PI / 2} position-z={0.012}><torusGeometry args={[R, 0.017, 10, 24, Math.max(0.03, pctExtra * Math.PI * 2 * 6)]} /></mesh>
      <AnimatedNumber3D from={0} to={pricingStats.pct} t0={t0 + 2.9} t1={t0 + 3.8} format="pct" size={0.085} weight="bold" depth={0.05} bevel={0.005} material={pctMat} />
    </group>
  );
}

export function Scene04Index() {
  useDirector('s04', (lt) => {
    rig.key.intensity = keys(lt, [[0, 36], [1.4, 22]]); rig.key.pos = [-2.4, 4, 4.5]; rig.key.target = [0, 1.6, 0];
    rig.rimL.intensity = 110; rig.rimL.pos = [-3.6, 3.4, -2]; rig.rimL.target = [0, 1.8, 0.4]; rig.rimL.color = '#eef2ff';
    rig.rimR.intensity = 110; rig.rimR.pos = [3.6, 3.4, -2]; rig.rimR.target = [0, 1.8, 0.4]; rig.rimR.color = '#eef2ff';
    rig.sweep.intensity = keys(lt, [[1.3, 0], [1.45, 200], [2.4, 90]]); rig.sweep.angle = 0.25; rig.sweep.color = '#ffffff';
    rig.sweep.pos = [keys(lt, [[1.3, -2.5], [3.5, 2.5]]), 3.4, 3]; rig.sweep.target = NUM_POS;
    rig.top.intensity = 12; rig.fill = 0.16; rig.floor = 1; rig.dust = 0.3;
    rig.glow = 0.6; rig.glowColor = '#1b1f28'; rig.glowPos = [0, 1.8, -8];
    fx.envIntensity = 0.85; fx.bloom = 0.6; fx.vignette = 0.62;
    fx.exposure = 1 + keys(lt, [[1.4, 0], [1.47, 0.14], [1.9, 0]]);
  });
  const num = useMemo(() => textMaterials.matteMetal(), []);
  const small = useMemo(() => textMaterials.ice(), []);
  const keep = (i: number) => i === 0 || i === CHART_N - 1;
  const slide = (t: number) => ease.inOut(clamp((t - (t0 + 0.35)) / 0.8));
  return (
    <SceneRoot id="s04">
      <BarChart3D data={chartData} {...CHART} growFn={() => 1}
        sinkFn={(i, t) => (keep(i) ? 0 : ease.in(clamp((t - (t0 + 0.02 + Math.abs(i - 3) * 0.05)) / 0.45)))}
        xFn={(i, t) => (i === 0 ? lerp(barX(0, CHART_N, CHART.spacing), -GAP_X, slide(t)) : i === CHART_N - 1 ? lerp(barX(i, CHART_N, CHART.spacing), GAP_X, slide(t)) : barX(i, CHART_N, CHART.spacing))}
        highlightFn={() => 1} countT={() => [0, 0.001]}
        labelScaleFn={(i) => (keep(i) ? 1.6 : 1)} connectorFn={() => 0} />
      <Dimension />
      <AnimatedNumber3D from={0} to={pricingStats.diff} t0={t0 + 0.3} t1={t0 + 1.45} format="brl"
        size={NUM_SIZE} weight="black" depth={0.38} bevel={0.022} tracking={0.01} material={num} position={NUM_POS}
        charAnim={(t: number, i: number, _n: number, m: THREE.Mesh) => {
          const k = ease.out(clamp((t - (t0 + 0.3 + i * 0.03)) / 0.5));
          m.position.z = (1 - k) * -1.2; m.scale.setScalar(Math.max(0.001, k));
        }} />
      <Text3D text="DE DIFERENÇA." size={0.062} weight="bold" tracking={0.2} depth={0.04} bevel={0.003} material={small}
        position={[0, MAX_TOP + 0.13, 0.3]}
        charAnim={(t: number, i: number, _n: number, m: THREE.Mesh) => {
          const k = ease.out(clamp((t - (t0 + 1.55 + i * 0.025)) / 0.45));
          m.position.y = (1 - k) * -0.8; m.scale.setScalar(Math.max(0.001, k));
        }} />
      <PercentRing />
    </SceneRoot>
  );
}

export { NUM_POS as S4_NUMBER_POS };
