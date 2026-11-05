/** CENA 09 — "SOFISTICAÇÃO SEM EXAGERO." / "PREÇO JUSTO. ESCOLHA INTELIGENTE." Preço só aparece se for configurado. */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { GlassCard3D } from '../components/GlassCard3D';
import { Text3D, textMaterials } from '../components/Text3D';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector } from './common';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { clock } from '../engine/clock';
import { keys } from '../motion/sequencing';
import { clamp, ease, lerp } from '../motion/easings';
import { brand } from '../config/brand';
import { brl } from '../config/pricing-data';

const t0 = T('s09');

registerShot('s09', (lt): Pose => {
  const u = ease.soft(clamp(lt / 4.45));
  const ang = lerp(0.22, 0.04, u);
  const dist = lerp(3.45, 3.1, u);
  return { pos: [Math.sin(ang) * dist, lerp(0.95, 0.9, u), Math.cos(ang) * dist], target: [0, 0.76, 0], fov: 32, bokeh: 1.6, focusRange: 0.9 };
}, 0.5);

/** Etiqueta editorial de preço — renderizada SOMENTE com brand.priceSupremacy definido. */
function PriceTagLR() {
  const g = useRef<THREE.Group>(null!);
  const amber = useMemo(() => textMaterials.amber(), []);
  useFrame(() => {
    if (!g.current) return;
    const k = ease.out(clamp((clock.t - (t0 + 1.9)) / 0.7));
    g.current.visible = clock.t > t0 + 1.85;
    g.current.position.set(0.62, 0.55 + (1 - k) * -0.06, 0.25);
    g.current.rotation.y = -0.35 + (1 - k) * 0.4;
    g.current.scale.setScalar(Math.max(0.001, k));
  });
  if (brand.priceSupremacy === null) return null;
  return (
    <group ref={g}>
      <GlassCard3D w={0.62} h={0.24} label={brl(brand.priceSupremacy)} size={0.085} sub="NA LR IMPORTS" />
      {brand.supremacyComparable && (
        <Text3D text={`Em ${brand.supremacyComparable.store}: ${brl(brand.supremacyComparable.price)} (${brand.supremacyComparable.date})`}
          size={0.022} weight="medium" depth={0.004} bevel={0} material={amber} position={[0, -0.17, 0.02]} />
      )}
    </group>
  );
}

export function Scene09Value() {
  useDirector('s09', () => {
    rig.key.intensity = 28; rig.key.pos = [1.4, 2.6, 3.2]; rig.key.target = [0, 0.7, 0]; rig.key.color = '#fff4e6'; rig.key.angle = 0.5;
    rig.rimL.intensity = 120; rig.rimL.color = '#f3f5fa'; rig.rimL.pos = [-2.2, 2.2, -2.4]; rig.rimL.target = [0, 0.7, 0];
    rig.rimR.intensity = 120; rig.rimR.color = '#e6bd85'; rig.rimR.pos = [2.4, 2.0, -2.2]; rig.rimR.target = [0, 0.7, 0];
    rig.sweep.intensity = 0; rig.top.intensity = 22;
    rig.fill = 0.16; rig.fillColor = '#c9b9a0'; rig.floor = 0.9; rig.dust = 0.35; rig.dustColor = '#ffdcae';
    rig.glow = 0.85; rig.glowColor = '#3a2a18'; rig.glowPos = [0, 0.9, -4];
    fx.envIntensity = 1.0; fx.bloom = 0.75; fx.vignette = 0.62; fx.exposure = 1; fx.fade = 0; fx.amber = 1;
  });
  return (
    <SceneRoot id="s09">
      <PriceTagLR />
      <Hud>
        <HudTitle y={0.66} lines={[
          { text: 'SOFISTICAÇÃO', at: t0 + 0.25, out: t0 + 2.15, size: 0.066, weight: 'black' },
          { text: 'SEM EXAGERO.', at: t0 + 0.42, out: t0 + 2.2, size: 0.066, weight: 'black', material: 'amber' },
        ]} />
        <HudTitle y={0.66} lines={[
          { text: 'PREÇO JUSTO.', at: t0 + 2.3, out: t0 + 4.2, size: 0.066, weight: 'black' },
          { text: 'ESCOLHA INTELIGENTE.', at: t0 + 2.5, out: t0 + 4.25, size: 0.044, weight: 'bold', tracking: 0.04, material: 'amber' },
        ]} />
      </Hud>
    </SceneRoot>
  );
}
