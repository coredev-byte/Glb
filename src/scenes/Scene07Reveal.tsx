/** CENA 07 — A aparição do Supremacy: contraluz, luz percorrendo as bordas, afastamento do close ao produto inteiro. */
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { Logo3D } from '../components/Logo3D';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector } from './common';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { clock } from '../engine/clock';
import { keys } from '../motion/sequencing';
import { clamp, ease, lerp } from '../motion/easings';

const t0 = T('s07');

registerShot('s07', (lt): Pose => {
  const u = ease.soft(clamp(lt / 5.8));
  const ang = lerp(0.13, -0.34, u);
  const dist = lerp(1.09, 3.55, ease.inOut(clamp(lt / 5.6)));
  return {
    pos: [Math.sin(ang) * dist, lerp(0.86, 0.98, u), Math.cos(ang) * dist],
    target: [0, lerp(0.82, 0.6, u), 0], fov: 30,
    focus: dist, focusRange: lerp(0.25, 0.9, u), bokeh: lerp(3.4, 2.0, u),
  };
});

function LogoReveal({ at, out }: { at: number; out: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(() => {
    const t = clock.t;
    const k = ease.out(clamp((t - at) / 0.8));
    const o = ease.in(clamp((t - out) / 0.4));
    g.current.visible = t > at && t < out + 0.4;
    g.current.position.y = 0.6 - (1 - k) * 0.04 + o * 0.04;
    g.current.rotation.y = (1 - k) * -0.6;
    g.current.scale.setScalar(Math.max(0.001, 0.3 * (0.9 + 0.1 * k) * (1 - o)));
  });
  return <group ref={g}><Logo3D /></group>;
}

export function Scene07Reveal() {
  useDirector('s07', (lt) => {
    const keyIn = ease.inOut(clamp((lt - 1.2) / 2.2));
    fx.amber = 1;
    rig.key.intensity = lerp(0, 22, keyIn); rig.key.pos = [1.8, 2.6, 3.0]; rig.key.target = [0, 0.7, 0]; rig.key.color = '#fff4e6'; rig.key.angle = 0.45;
    rig.rimL.intensity = 150; rig.rimL.color = '#f3f5fa'; rig.rimL.pos = [-2.2, 2.0, -2.4]; rig.rimL.target = [0, 0.7, 0];
    rig.rimR.intensity = 160; rig.rimR.color = '#e6bd85'; rig.rimR.pos = [2.4, 1.9, -2.2]; rig.rimR.target = [0, 0.7, 0];
    // a luz percorre as bordas: varredura vertical em arco
    const sw = clamp(lt / 3.6);
    rig.sweep.intensity = keys(lt, [[0, 0], [0.25, 16], [3.4, 16], [3.9, 0]]); rig.sweep.angle = 0.12; rig.sweep.color = '#ffffff';
    rig.sweep.pos = [lerp(-1.6, 1.8, ease.inOut(sw)), lerp(2.2, 1.0, sw), 2.2]; rig.sweep.target = [0, lerp(1.1, 0.4, sw), 0];
    rig.top.intensity = 9; rig.top.angle = 0.35; rig.top.pos = [0, 4.5, 0.6]; rig.top.target = [0, 0.6, 0];
    rig.fill = lerp(0.03, 0.12, keyIn); rig.fillColor = '#c9b9a0'; rig.floor = 0.9; rig.dust = 0.5; rig.dustColor = '#ffdcae';
    rig.glow = lerp(0.9, 0.75, keyIn); rig.glowColor = '#3a2a18'; rig.glowPos = [0, 0.9, -4];
    fx.envIntensity = lerp(0.55, 1.0, keyIn); fx.bloom = 0.85; fx.vignette = 0.68; fx.fade = 0;
    fx.exposure = 1 + keys(lt, [[0, 0.1], [0.6, 0]]);
  });
  return (
    <SceneRoot id="s07">
      <Hud>
        <HudTitle y={0.66} lines={[
          { text: 'UMA OUTRA FORMA', at: t0 + 0.55, out: t0 + 3.0, size: 0.056, weight: 'bold', tracking: 0.05 },
          { text: 'DE ESCOLHER.', at: t0 + 0.75, out: t0 + 3.05, size: 0.056, weight: 'bold', tracking: 0.05 },
        ]} />
        <LogoReveal at={t0 + 3.15} out={t0 + 5.55} />
      </Hud>
    </SceneRoot>
  );
}
