/** CENA 05 — "PREÇO BAIXO ≠ PREÇO JUSTO". O número se fragmenta e as peças se reorganizam numa balança abstrata. */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { CAP, glyphGeometry, advance } from '../components/Text3D';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector } from './common';
import { NUM_POS, NUM_SIZE } from './Scene04Index';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { clock } from '../engine/clock';
import { keys, rng } from '../motion/sequencing';
import { clamp, ease, lerp } from '../motion/easings';
import { brl, pricingStats } from '../config/pricing-data';

const t0 = T('s05');
const COUNT = 520;
const PIVOT = new THREE.Vector3(0, 1.3, 0.3);
const ARM = 0.6;
const HANG = 0.34;

export const beamTilt = (t: number) => keys(t - t0, [
  [0.9, 0], [1.25, 0.13, ease.overshoot], [1.9, 0.02, ease.inOut], [2.2, 0.05], [2.95, -0.15, ease.overshoot], [3.6, -0.1, ease.inOut], [4.7, -0.1],
]);

registerShot('s05', (lt): Pose => {
  const ang = lerp(0.42, 0.0, ease.inOut(clamp(lt / 1.6)));
  const dist = keys(lt, [[0, 5.4], [1.6, 5.0, ease.inOut], [4.0, 4.5, ease.soft], [4.7, 4.2]]);
  return {
    pos: [Math.sin(ang) * dist, keys(lt, [[0, 1.95], [1.6, 1.45]]), PIVOT.z + Math.cos(ang) * dist],
    target: keys<number[]>(lt, [[0, [0, 1.86, 0.2]], [1.6, [0, 1.12, 0.3]]]) as any, fov: 36,
    focus: dist, focusRange: 1.2, bokeh: 1.4,
  };
});

/** Pontos iniciais: amostrados na superfície real dos glifos do número da cena 4. */
function sampleNumberPoints(n: number) {
  const text = brl(pricingStats.diff);
  const style = { weight: 'black' as const, depth: 0.38, bevel: 0.022 };
  const chars = [...text];
  let x = 0;
  const placed = chars.map((c) => { const p = { c, x }; x += advance(c, 'black') + 0.01; return p; });
  const width = x - 0.01;
  const r = rng(11);
  const out: THREE.Vector3[] = [];
  const pools = placed.filter((p) => p.c !== ' ').map((p) => ({ p, pos: glyphGeometry(p.c, style).getAttribute('position') }));
  for (let i = 0; i < n; i++) {
    const pool = pools[Math.floor(r() * pools.length)];
    const k = Math.floor(r() * pool.pos.count);
    out.push(new THREE.Vector3(
      NUM_POS[0] + (pool.p.x + pool.pos.getX(k) - width / 2) * NUM_SIZE,
      NUM_POS[1] + (pool.pos.getY(k) - CAP / 2) * NUM_SIZE,
      NUM_POS[2] + pool.pos.getZ(k) * NUM_SIZE,
    ));
  }
  return out;
}

/** Formas-alvo: etiqueta de promoção (esq.) e diamante de valor (dir.), relativas ao centro do prato. */
function tagShape(r: () => number) {
  // contorno de etiqueta com ponta à esquerda + furo
  const w = 0.36, h = 0.21;
  const u = r();
  const edge = r();
  if (u < 0.75) {
    const per = edge * 4;
    const seg = Math.floor(per), f = per - seg;
    const pts = [[-w / 2 + 0.1, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2 + 0.1, -h / 2]];
    if (seg < 3) {
      const a = pts[seg], b = pts[seg + 1];
      return new THREE.Vector3(lerp(a[0], b[0], f), lerp(a[1], b[1], f) + h / 2 + 0.03, (r() - 0.5) * 0.04);
    }
    // ponta
    const a = f < 0.5 ? [-w / 2 + 0.1, -h / 2] : [-w / 2, 0];
    const b = f < 0.5 ? [-w / 2, 0] : [-w / 2 + 0.1, h / 2];
    const ff = (f % 0.5) * 2;
    return new THREE.Vector3(lerp(a[0], b[0], ff), lerp(a[1], b[1], ff) + h / 2 + 0.03, (r() - 0.5) * 0.04);
  }
  const ang = r() * Math.PI * 2;
  return new THREE.Vector3(-w / 2 + 0.13 + Math.cos(ang) * 0.035, Math.sin(ang) * 0.035 + h / 2 + 0.03, 0);
}
function diamondShape(r: () => number) {
  // superfície de um octaedro alongado (lapidação)
  const a = r() * Math.PI * 2, top = r() < 0.38;
  const ring = 0.15, hTop = 0.07, hBot = 0.19;
  const f = r();
  const rr = ring * (top ? lerp(1, 0.55, f) : 1 - f);
  const y = top ? hBot + f * hTop : f * hBot;
  return new THREE.Vector3(Math.cos(a) * rr, y + 0.03, Math.sin(a) * rr * 0.6);
}

function Shards() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(() => {
    const r = rng(23);
    const start = sampleNumberPoints(COUNT);
    return start.map((s, i) => {
      const left = i % 2 === 0;
      const tgt = left ? tagShape(r) : diamondShape(r);
      const ctrl = new THREE.Vector3((r() - 0.5) * 2.4, 0.6 + r() * 1.4, (r() - 0.2) * 1.6);
      return {
        s, tgt, ctrl, left,
        delay: r() * 0.55 + (left ? 0 : 0.12), dur: 0.7 + r() * 0.5,
        rot: new THREE.Euler(r() * 6, r() * 6, r() * 6), spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(9),
        scale: 0.016 + r() * 0.026,
      };
    });
  }, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#c9cdd3', metalness: 1, roughness: 0.3, clearcoat: 0.6 }), []);
  const geo = useMemo(() => new THREE.TetrahedronGeometry(1, 0), []);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
  const panL = new THREE.Vector3(), panR = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  useFrame(() => {
    const t = clock.t;
    const lt = t - t0;
    if (lt < -0.1 || lt > 5) return;
    const th = beamTilt(t);
    panL.set(PIVOT.x - Math.cos(th) * ARM, PIVOT.y + Math.sin(th) * ARM - HANG, PIVOT.z);
    panR.set(PIVOT.x + Math.cos(th) * ARM, PIVOT.y - Math.sin(th) * ARM - HANG, PIVOT.z);
    const dim = 1 - clamp((lt - 4.2) / 0.5);
    data.forEach((d, i) => {
      const u = ease.inOut(clamp((lt - 0.05 - d.delay) / d.dur));
      const end = a.copy(d.tgt).add(d.left ? panL : panR);
      // bezier quadrática start → ctrl → end
      const mid = b.copy(d.ctrl).add(new THREE.Vector3(0, 0, 0));
      p.set(0, 0, 0)
        .addScaledVector(d.s, (1 - u) * (1 - u))
        .addScaledVector(mid, 2 * (1 - u) * u)
        .addScaledVector(end, u * u);
      // pequeno "respiro" após assentar
      p.y += Math.sin(t * 2 + i) * 0.004 * u;
      const spinK = 1 - u;
      e.set(d.rot.x + d.spin.x * spinK * lt, d.rot.y + d.spin.y * spinK * lt, d.rot.z + d.spin.z * spinK * lt);
      q.setFromEuler(e);
      const s = d.scale * (lt < 0 ? 0 : 1) * (0.4 + 0.6 * dim);
      sc.setScalar(s);
      m4.compose(p, q, sc);
      mesh.current.setMatrixAt(i, m4);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false} />;
}

function Balance() {
  const beam = useRef<THREE.Group>(null!);
  const pans = useRef<THREE.Group[]>([]);
  const root = useRef<THREE.Group>(null!);
  const metal = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b9bec6', metalness: 1, roughness: 0.22, clearcoat: 0.6 }), []);
  const dark = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#15171b', metalness: 0.8, roughness: 0.25, clearcoat: 1 }), []);
  const wire = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9298A3', toneMapped: false }), []);
  useFrame(() => {
    const t = clock.t;
    const lt = t - t0;
    const k = ease.out(clamp((lt - 0.6) / 0.7));
    root.current.scale.setScalar(Math.max(0.001, k));
    const th = beamTilt(t);
    beam.current.rotation.z = th;
    pans.current.forEach((p, i) => {
      const sx = i === 0 ? -1 : 1;
      p.position.set(PIVOT.x + sx * Math.cos(th) * ARM, PIVOT.y - sx * Math.sin(th) * ARM, PIVOT.z);
    });
  });
  return (
    <group ref={root}>
      <mesh material={dark} position={[PIVOT.x, PIVOT.y / 2, PIVOT.z]}><cylinderGeometry args={[0.018, 0.03, PIVOT.y, 24]} /></mesh>
      <mesh material={dark} position={[PIVOT.x, 0.02, PIVOT.z]}><cylinderGeometry args={[0.2, 0.24, 0.04, 48]} /></mesh>
      <group ref={beam} position={PIVOT.toArray()}>
        <RoundedBox args={[ARM * 2 + 0.06, 0.035, 0.035]} radius={0.012} material={metal} />
        <mesh material={metal} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.045, 0.045, 0.06, 32]} /></mesh>
      </group>
      {[0, 1].map((i) => (
        <group key={i} ref={(el) => { if (el) pans.current[i] = el; }}>
          <mesh material={wire} position-y={-HANG / 2}><cylinderGeometry args={[0.0025, 0.0025, HANG, 6]} /></mesh>
          <mesh material={dark} position-y={-HANG}><cylinderGeometry args={[0.22, 0.19, 0.016, 64]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function NotEqual({ at }: { at: number }) {
  const g = useRef<THREE.Group>(null!);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#E6C08A', roughness: 0.3, metalness: 0.6, emissive: '#B78C57', emissiveIntensity: 0.6 }), []);
  useFrame(() => {
    const k = ease.overshoot(clamp((clock.t - at) / 0.45));
    g.current.visible = clock.t > at && clock.t < t0 + 4.6;
    g.current.scale.setScalar(Math.max(0.001, k));
    g.current.rotation.z = (1 - k) * 0.6;
  });
  return (
    <group ref={g} position={[0, 0.545, 0]}>
      <RoundedBox args={[0.11, 0.014, 0.02]} radius={0.005} position-y={0.02} material={mat} />
      <RoundedBox args={[0.11, 0.014, 0.02]} radius={0.005} position-y={-0.02} material={mat} />
      <RoundedBox args={[0.014, 0.12, 0.02]} radius={0.005} rotation-z={-0.5} material={mat} />
    </group>
  );
}

export function Scene05Reframe() {
  useDirector('s05', (lt) => {
    const contract = ease.inOut(clamp((lt - 3.7) / 0.6));
    rig.key.intensity = lerp(30, 6, contract); rig.key.pos = [-1.5, 4, 4]; rig.key.target = [0, 1, 0.3]; rig.key.color = '#f4f4f1';
    rig.rimL.intensity = lerp(90, 20, contract); rig.rimL.color = '#e8ecf4'; rig.rimL.pos = [-3.2, 3, -2]; rig.rimL.target = PIVOT.toArray() as any;
    rig.rimR.intensity = lerp(90, 20, contract); rig.rimR.color = '#e8ecf4'; rig.rimR.pos = [3.2, 3, -2]; rig.rimR.target = PIVOT.toArray() as any;
    rig.sweep.intensity = 0;
    rig.top.intensity = lerp(16, 40, contract); rig.top.angle = lerp(0.5, 0.18, contract); rig.top.pos = [0, 5, 0.3]; rig.top.target = [0, 1, 0.3];
    rig.fill = lerp(0.14, 0.02, contract); rig.floor = lerp(0.6, 0.3, contract); rig.dust = lerp(0.3, 0.05, contract); rig.dustColor = '#e8ecf4';
    rig.glow = lerp(0.5, 0, contract); rig.glowColor = '#161a22';
    fx.envIntensity = lerp(0.75, 0.2, contract); fx.bloom = 0.6; fx.vignette = lerp(0.6, 0.85, contract);
    // pequeno silêncio antes da virada: a imagem quase apaga junto com o corte da música
    fx.fade = keys(lt, [[3.85, 0], [4.55, 0.82, ease.inOut], [4.7, 1]]);
    fx.exposure = 1;
  });
  return (
    <SceneRoot id="s05">
      <Balance />
      <Shards />
      <Hud>
        <HudTitle y={0.66} lines={[
          { text: 'PREÇO BAIXO', at: t0 + 0.4, out: t0 + 4.2, size: 0.068, weight: 'black' },
        ]} />
        <NotEqual at={t0 + 1.6} />
        <HudTitle y={0.43} lines={[
          { text: 'PREÇO JUSTO', at: t0 + 2.1, out: t0 + 4.25, size: 0.068, weight: 'black', material: 'silver' },
        ]} />
      </Hud>
    </SceneRoot>
  );
}
