/** CENA 08 — SUPREMACY / COLLECTOR'S EDITION e a arquitetura da fragrância (abertura, coração, base). */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { FragranceNotes3D } from '../components/FragranceNotes3D';
import { Text3D, textMaterials } from '../components/Text3D';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector } from './common';
import { PED_H } from './HeroSet';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { clock } from '../engine/clock';
import { keys } from '../motion/sequencing';
import { clamp, ease } from '../motion/easings';

const t0 = T('s08');
export const NOTE_WINDOWS: [number, number][] = [[t0 + 1.55, t0 + 2.95], [t0 + 2.95, t0 + 4.2], [t0 + 4.2, t0 + 5.65]];

registerShot('s08', (lt): Pose => {
  // close na tampa → órbita → afastamento com visão do conjunto
  const pos = keys<number[]>(lt, [
    [0, [0.3, 1.2, 0.95]],
    [1.45, [-1.1, 1.18, 2.35], ease.inOut],
    [3.4, [-1.0, 1.25, 3.05], ease.soft],
    [5.5, [0.65, 1.3, 3.45], ease.soft],
  ]);
  const target = keys<number[]>(lt, [
    [0, [0, 1.06, 0]],
    [1.45, [0, 0.8, 0], ease.inOut],
    [3.4, [0, 0.72, 0], ease.soft],
    [5.5, [0, 0.7, 0], ease.soft],
  ]);
  return { pos: pos as any, target: target as any, fov: keys(lt, [[0, 30], [5.5, 33]]), bokeh: keys(lt, [[0, 3.0], [3, 1.8]]), focusRange: 0.7 };
});

function SectionLabel() {
  const labels = ['ABERTURA', 'CORAÇÃO', 'BASE'];
  const mats = useMemo(() => labels.map(() => textMaterials.amber()), []);
  const refs = useRef<THREE.Group[]>([]);
  const line = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const t = clock.t;
    labels.forEach((_, i) => {
      const [a, b] = NOTE_WINDOWS[i];
      const k = ease.out(clamp((t - a) / 0.4)) * (1 - ease.in(clamp((t - (b - 0.15)) / 0.3)));
      const g = refs.current[i];
      g.visible = k > 0.001;
      g.position.y = 0.5 - (1 - k) * 0.03;
      g.scale.setScalar(Math.max(0.001, k));
    });
    const on = ease.out(clamp((t - NOTE_WINDOWS[0][0]) / 0.5)) * (1 - ease.in(clamp((t - (NOTE_WINDOWS[2][1] - 0.1)) / 0.4)));
    line.current.scale.x = Math.max(0.001, on);
  });
  return (
    <group>
      {labels.map((l, i) => (
        <group key={l} ref={(el) => { if (el) refs.current[i] = el; }}>
          <Text3D text={l} size={0.03} weight="bold" tracking={0.34} depth={0.02} bevel={0.002} material={mats[i]} />
        </group>
      ))}
      <mesh ref={line} position-y={0.465}><boxGeometry args={[0.22, 0.0025, 0.002]} /><meshBasicMaterial color="#B78C57" toneMapped={false} /></mesh>
    </group>
  );
}

export function Scene08Notes() {
  useDirector('s08', (lt) => {
    rig.key.intensity = 24; rig.key.pos = [1.6, 2.8, 2.8]; rig.key.target = [0, 0.8, 0]; rig.key.color = '#fff4e6'; rig.key.angle = 0.5;
    rig.rimL.intensity = 130; rig.rimL.color = '#f3f5fa'; rig.rimL.pos = [-2.2, 2.2, -2.4]; rig.rimL.target = [0, 0.7, 0];
    rig.rimR.intensity = 130; rig.rimR.color = '#e6bd85'; rig.rimR.pos = [2.4, 2.0, -2.2]; rig.rimR.target = [0, 0.7, 0];
    rig.sweep.intensity = keys(lt, [[0, 120], [1.6, 0]]); rig.sweep.pos = [0.8, 2.0, 1.6]; rig.sweep.target = [0, 1.1, 0]; rig.sweep.angle = 0.15;
    rig.top.intensity = 20; rig.fill = 0.14; rig.fillColor = '#c9b9a0'; rig.floor = 0.9; rig.dust = 0.45; rig.dustColor = '#ffdcae';
    rig.glow = 0.75; rig.glowColor = '#3a2a18'; rig.glowPos = [0, 0.9, -4];
    fx.envIntensity = 1.0; fx.bloom = 0.8; fx.vignette = 0.66; fx.exposure = 1; fx.fade = 0; fx.amber = 1;
  });
  return (
    <SceneRoot id="s08" post={0.9}>
      <FragranceNotes3D windows={NOTE_WINDOWS} center={[0, PED_H, 0]} radius={0.82} />
      <Hud>
        <HudTitle y={0.68} lines={[
          { text: 'SUPREMACY', at: t0 + 0.1, out: t0 + 5.25, size: 0.07, weight: 'light', tracking: 0.32, material: 'silver' },
          { text: 'COLLECTOR’S EDITION', at: t0 + 0.45, out: t0 + 5.3, size: 0.03, weight: 'bold', tracking: 0.34, material: 'amber' },
        ]} />
        <SectionLabel />
      </Hud>
    </SceneRoot>
  );
}
