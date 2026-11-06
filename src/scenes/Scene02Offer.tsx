/** CENA 02 — "MAS SERÁ QUE É?" A câmera atravessa o card de oferta e encontra uma etiqueta gigante instável. */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { ProductModel } from '../components/ProductModel';
import { GlassCard3D } from '../components/GlassCard3D';
import { BlobShadow, LuxuryPedestal } from '../components/LuxuryPedestal';
import { RollingDigits3D } from '../components/AnimatedNumber3D';
import { Text3D, textMaterials } from '../components/Text3D';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { registerShot, Pose, shots } from '../components/CameraRig';
import { SceneRoot, T, useDirector, useSceneFrame } from './common';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { keys } from '../motion/sequencing';
import { clamp, ease } from '../motion/easings';
import { S1_CARDS } from './Scene01Hook';
import { brl, pricingSample } from '../config/pricing-data';

type V3 = [number, number, number];
const t0 = T('s02');

// card "OFERTA" da cena 1 — a câmera o atravessa
const C = new THREE.Vector3(...S1_CARDS[0].pos);
const ROT = S1_CARDS[0].rot;
const Nc = new THREE.Vector3(Math.sin(ROT), 0, Math.cos(ROT));
// o set da cena 2 fica "atrás" do card
const O2 = C.clone().addScaledVector(Nc, -3.0).setY(0);
const L = (x: number, y: number, z: number): V3 => {
  const v = new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), ROT).add(O2);
  return [v.x, v.y, v.z];
};

const S1_END = shots.s01!.shot(T('s01') + 3.2, 3.2);
const P0: V3 = S1_END.pos;
const TG0: V3 = S1_END.target;
const front = C.clone().addScaledVector(Nc, 0.38);
const through = C.clone().addScaledVector(Nc, -0.06);

registerShot('s02', (lt): Pose => {
  const pos = keys<number[]>(lt, [
    [0, P0],
    [0.55, front.toArray(), ease.in],
    [0.68, through.toArray(), ease.linear],
    [1.5, L(0.14, 1.0, 2.8), ease.out],
    [4.0, L(0.04, 0.94, 2.5), ease.soft],
  ]) as V3;
  const target = keys<number[]>(lt, [
    [0, TG0],
    [0.55, C.clone().addScaledVector(Nc, -1).toArray(), ease.inOut],
    [0.68, L(0, 0.92, 0), ease.linear],
    [1.5, L(-0.06, 0.92, 0), ease.out],
    [2.5, L(-0.06, 0.92, 0)],
    [3.0, L(0.2, 0.7, -0.8), ease.inOut],
    [4.0, L(0.16, 0.72, -0.7)],
  ]) as V3;
  // rack focus: etiqueta → Asad ("a história muda")
  const focus = keys(lt, [[0, 4.0], [1.5, 2.8], [2.45, 2.8], [3.0, 4.0, ease.inOut], [4, 3.7]]);
  return { pos, target, fov: keys(lt, [[0, 32], [0.68, 30], [1.6, 34]]), focus, focusRange: 0.5, bokeh: keys(lt, [[0, 1.6], [0.8, 3.0]]) };
});

// valor exibido pela etiqueta: rola entre preços REAIS da amostra
const rollKeys: [number, number][] = [
  [0.55, 199.41], [1.0, 399.9], [1.4, 238.9], [1.8, 359.99], [2.15, 339.0], [2.5, 350.09], [2.9, 199.41], [3.35, 399.9],
];
const valueAt = (t: number) => {
  const lt = t - t0;
  return keys(lt, rollKeys.map(([a, v]) => [a, v, ease.inOut] as [number, number, any]));
};

function PriceTag() {
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#0e1014', roughness: 0.1, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.86 }), []);
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ color: '#CDD0D5', side: THREE.BackSide, toneMapped: false, transparent: true, opacity: 0.6 }), []);
  const metal = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#cfd3d9', metalness: 1, roughness: 0.25 }), []);
  const digits = useMemo(() => textMaterials.silver(), []);
  const small = useMemo(() => textMaterials.ice(), []);
  return (
    <group>
      <RoundedBox args={[1.56, 0.66, 0.05]} radius={0.06} smoothness={4} material={rim} scale={[1.008, 1.02, 0.6]} />
      <RoundedBox args={[1.56, 0.66, 0.05]} radius={0.06} smoothness={4} material={glass} />
      {/* ilhós + cordão */}
      <mesh material={metal} position={[-0.66, 0.2, 0.03]}><torusGeometry args={[0.04, 0.012, 12, 32]} /></mesh>
      <Text3D text="R$" size={0.09} weight="medium" depth={0.05} bevel={0.005} material={small} position={[-0.52, -0.05, 0.05]} />
      <RollingDigits3D valueFn={valueAt} digits={3} decimals={2} size={0.19} weight="bold" depth={0.14} bevel={0.012} material={digits} position={[0.12, -0.15, 0.06]} />
      <Text3D text={pricingSample.product.toUpperCase()} size={0.026} weight="medium" tracking={0.14} depth={0.01} bevel={0} material={small} position={[0.08, 0.24, 0.04]} />
    </group>
  );
}

const ORBIT = pricingSample.stores.filter((_, i) => i === 1 || i === 5 || i === 3).map((s) => brl(s.price));

export function Scene02Offer() {
  const tag = useRef<THREE.Group>(null!);
  const orbit = useRef<THREE.Group[]>([]);

  useDirector('s02', (lt) => {
    rig.key.intensity = 30; rig.key.pos = L(1.6, 3.2, 3.0); rig.key.target = L(0, 0.9, 0.4); rig.key.color = '#f4f4f1';
    rig.rimL.intensity = 60; rig.rimL.color = '#dfe6ff'; rig.rimL.pos = L(-2.4, 2.4, -1.8); rig.rimL.target = L(0.5, 0.5, -0.5);
    rig.rimR.intensity = 70; rig.rimR.color = '#ffd9a0'; rig.rimR.pos = L(2.6, 2.0, -2.0); rig.rimR.target = L(0.5, 0.5, -0.5);
    rig.sweep.intensity = keys(lt, [[0, 0], [0.8, 0], [1.2, 90], [3.6, 90], [4, 0]]);
    rig.sweep.pos = L(keys(lt, [[0.8, -1.5], [3.8, 1.5]]), 1.6, 2.4); rig.sweep.target = L(0, 0.95, 0.55); rig.sweep.angle = 0.22; rig.sweep.color = '#ffffff';
    rig.top.intensity = 14; rig.top.pos = L(0.5, 5, 0); rig.top.target = L(0.5, 0, -0.5);
    rig.fill = 0.16; rig.floor = 1; rig.dust = 0.55; rig.dustColor = '#f4ead8';
    rig.glow = 0.45; rig.glowColor = '#1c2029'; rig.glowPos = L(0, 1.2, -6);
    fx.envIntensity = 0.75; fx.bloom = 0.65; fx.vignette = 0.65;
    // flash discreto ao atravessar o vidro
    fx.exposure = 1 + keys(lt, [[0.5, 0], [0.62, 0.45], [0.85, 0]]);
  });

  useSceneFrame('s02', (lt) => {
    const k = ease.out(clamp((lt - 0.6) / 0.9));
    tag.current.position.set(...L(-0.12, 0.98 - (1 - k) * 0.25, 0));
    tag.current.scale.setScalar(0.52);
    tag.current.rotation.set(-0.05 + Math.sin(lt * 1.7) * 0.015, ROT + 0.24 + Math.sin(lt * 0.9) * 0.03, -0.02);
    // pequenas etiquetas orbitando o Asad — perdem a "confiança" (oscilam e se desalinham)
    orbit.current.forEach((g, i) => {
      const a = lt * 0.8 + (i / 3) * Math.PI * 2;
      const wob = clamp((lt - 2.4) / 1.2);
      const c = L(0.3, 0.45 + i * 0.16, -1.05);
      g.position.set(c[0] + Math.cos(a) * 0.42, c[1] + Math.sin(a * 2 + i) * 0.04 * (1 + wob * 3), c[2] + Math.sin(a) * 0.42);
      g.rotation.set(Math.sin(lt * 3 + i) * 0.15 * wob, ROT + Math.sin(a) * 0.35, Math.sin(lt * 2.4 + i) * 0.25 * wob);
      g.scale.setScalar(ease.out(clamp((lt - 1.1 - i * 0.15) / 0.6)) * 0.5 + 0.0001);
    });
  }, 0, 0.3);

  // vitrines abstratas (molduras e prateleiras em perspectiva)
  const shelves = useMemo(() => {
    const out: { p: V3; s: V3; glow: boolean }[] = [];
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        const z = -1.4 - i * 1.4, x = side * 1.75;
        out.push({ p: L(x, 1.2, z), s: [0.04, 2.4, 0.04], glow: false });
        out.push({ p: L(x - side * 0.35, 0.7, z), s: [0.7, 0.02, 0.3], glow: true });
        out.push({ p: L(x - side * 0.35, 1.45, z), s: [0.7, 0.02, 0.3], glow: true });
      }
    }
    return out;
  }, []);
  const frameMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#2a2d33', metalness: 1, roughness: 0.3 }), []);
  const stripMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8d939c', toneMapped: false }), []);

  return (
    <SceneRoot id="s02" pre={-0.6}>
      <group position={L(0, 0, 0)} rotation-y={ROT}>
        <group position={[0.3, 0, -1.05]}>
          <LuxuryPedestal radius={0.32} height={0.08} glowColor="#CDD0D5" spin={0.2} />
          <group position-y={0.08} rotation-y={-0.5}><ProductModel id="asad" scale={0.82} /></group>
          <BlobShadow size={0.7} y={0.082} />
        </group>
      </group>
      <group ref={tag}><PriceTag /></group>
      {ORBIT.map((p, i) => (
        <GlassCard3D key={p} ref={(el: THREE.Group) => { if (el) orbit.current[i] = el; }} label={p} w={0.5} h={0.13} size={0.042} tracking={0.03} />
      ))}
      {shelves.map((s, i) => (
        <mesh key={i} position={s.p} rotation-y={ROT} scale={s.s} material={s.glow ? stripMat : frameMat}><boxGeometry /></mesh>
      ))}
      <Hud>
        <HudTitle y={0.64} lines={[
          { text: 'MAS SERÁ', at: t0 + 1.95, out: t0 + 3.45, size: 0.08, weight: 'black' },
          { text: 'QUE É?', at: t0 + 2.15, out: t0 + 3.5, size: 0.08, weight: 'black' },
        ]} />
      </Hud>
    </SceneRoot>
  );
}
