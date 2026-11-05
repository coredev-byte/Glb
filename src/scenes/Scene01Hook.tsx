/** CENA 01 — "TEM CHEIRO DE OFERTA." Frasco do Asad emerge do escuro; cards de vidro com promessas. */
import { useRef } from 'react';
import * as THREE from 'three';
import { ProductModel } from '../components/ProductModel';
import { GlassCard3D } from '../components/GlassCard3D';
import { BlobShadow } from '../components/LuxuryPedestal';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { registerShot } from '../components/CameraRig';
import { SceneRoot, useDirector, useSceneFrame } from './common';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { keys } from '../motion/sequencing';
import { clamp, ease, lerp } from '../motion/easings';

export const S1_CARDS = [
  { label: 'OFERTA', at: 1.1, pos: [-0.33, 0.88, 0.45] as const, rot: 0.38, w: 0.44 },
  { label: 'PREÇO BAIXO', at: 1.4, pos: [0.35, 0.52, 0.4] as const, rot: -0.34, w: 0.56 },
  { label: 'IMPERDÍVEL', at: 1.7, pos: [-0.3, 0.2, 0.55] as const, rot: 0.22, w: 0.52 },
];

registerShot('s01', (lt) => {
  const u = ease.soft(clamp(lt / 3.2));
  const ang = lerp(-0.62, -0.12, u);
  const dist = lerp(4.6, 4.0, u);
  return {
    pos: [Math.sin(ang) * dist, lerp(0.5, 0.72, u), Math.cos(ang) * dist],
    target: [0, lerp(0.62, 0.68, u), 0], fov: 32, bokeh: 1.6, focusRange: 1.0,
  };
});

export function Scene01Hook() {
  const bottle = useRef<THREE.Group>(null!);
  const cards = useRef<THREE.Group[]>([]);

  useDirector('s01', (lt) => {
    const sw = clamp(lt / 2.0);
    rig.bg = '#060709';
    rig.key.intensity = keys(lt, [[0, 0], [1.0, 0], [2.4, 26, ease.inOut]]);
    rig.key.pos = [2.2, 3.2, 2.6]; rig.key.color = '#fff6ea';
    // contraluz dourado já no primeiro frame (silhueta intrigante)
    rig.rimL.intensity = keys(lt, [[0, 26], [1.4, 70]]); rig.rimL.color = '#ffcf8a'; rig.rimL.pos = [-2.6, 2.4, -2.4];
    rig.rimR.intensity = keys(lt, [[0, 8], [1.6, 55]]); rig.rimR.color = '#ffd9a0'; rig.rimR.pos = [2.8, 2.0, -2.2];
    // light sweep atravessando o frasco
    rig.sweep.intensity = keys(lt, [[0, 0], [0.15, 60], [1.9, 60], [2.4, 0]]);
    rig.sweep.pos = [lerp(-3.2, 3.2, ease.inOut(sw)), 1.4, 2.4]; rig.sweep.target = [lerp(-0.3, 0.3, sw), 0.55, 0];
    rig.sweep.angle = 0.16; rig.sweep.color = '#fff0d8';
    rig.top.intensity = keys(lt, [[0, 0], [2, 10]]);
    rig.fill = keys(lt, [[0, 0.02], [2.5, 0.18]]);
    rig.floor = 1; rig.dust = 0.75; rig.dustColor = '#ffe3b3';
    rig.glow = keys(lt, [[0, 0], [2.6, 0.5]]); rig.glowColor = '#2a2116'; rig.glowPos = [0, 1, -5];
    fx.envIntensity = keys(lt, [[0, 0.05], [2.2, 0.7]]);
    fx.exposure = 1.0; fx.bloom = 0.75; fx.vignette = 0.7; fx.fade = 0; fx.amber = 0;
  });

  useSceneFrame('s01', (lt) => {
    bottle.current.rotation.y = lerp(-1.1, -0.18, ease.quint(clamp(lt / 2.9)));
    S1_CARDS.forEach((c, i) => {
      const g = cards.current[i];
      const k = ease.out(clamp((lt - c.at) / 0.8));
      g.visible = k > 0.001;
      g.position.set(c.pos[0] + (1 - k) * (c.pos[0] > 0 ? 0.8 : -0.8), c.pos[1] + Math.sin(lt * 1.3 + i) * 0.015, c.pos[2] - (1 - k) * 0.6);
      g.rotation.set(0.05, c.rot + (1 - k) * (c.pos[0] > 0 ? -0.9 : 0.9), (1 - k) * 0.2);
      g.scale.setScalar(0.4 + 0.6 * k);
    });
  }, 0, 0.62);

  return (
    <SceneRoot id="s01" post={0.62}>
      <group ref={bottle}>
        <ProductModel id="asad" />
      </group>
      <BlobShadow size={0.9} />
      {S1_CARDS.map((c, i) => (
        <GlassCard3D key={c.label} ref={(el: THREE.Group) => { if (el) cards.current[i] = el; }} label={c.label} w={c.w} h={0.14} size={0.042} tracking={0.08} />
      ))}
      <Hud>
        <HudTitle y={0.64} lines={[
          { text: 'TEM CHEIRO', at: 0.55, out: 3.0, size: 0.075, weight: 'black', tracking: 0.01 },
          { text: 'DE OFERTA.', at: 0.75, out: 3.05, size: 0.075, weight: 'black', tracking: 0.01 },
        ]} />
      </Hud>
    </SceneRoot>
  );
}
