/** CENA 06 — "O QUE DEVE DEIXAR RASTRO… É A FRAGRÂNCIA." A última peça vira uma gota âmbar; ondas e rastros. */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { Ripples, ScentTrails } from '../components/ScentTrails';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector, useSceneFrame } from './common';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { keys } from '../motion/sequencing';
import { clamp, ease, lerp } from '../motion/easings';

const t0 = T('s06');
const IMPACT = 2.05; // lt do impacto (24,55 s)
export const DROP_X = 0, DROP_Z = 2.6, SURFACE_Y = 0.55;
const dropY = (lt: number) => keys(lt, [[1.15, 1.42], [IMPACT, SURFACE_Y, ease.in]]);

registerShot('s06', (lt): Pose => {
  const pos = keys<number[]>(lt, [
    [0, [0, 1.45, 4.3]],
    [1.15, [0, 1.42, 3.75], ease.soft],
    [IMPACT, [0, 1.12, 3.95], ease.inOut],
    [2.7, [0, 1.15, 4.9], ease.out],
    [4.7, [0.14, 0.86, 1.08], ease.luxe],
  ]);
  const target = keys<number[]>(lt, [
    [0, [0, 1.45, DROP_Z]],
    [1.15, [0, 1.42, DROP_Z]],
    [IMPACT, [0, SURFACE_Y + 0.15, DROP_Z], ease.inOut],
    [2.7, [0, 0.95, DROP_Z - 0.8], ease.out],
    [4.7, [0, 0.82, 0], ease.luxe],
  ]);
  return { pos: pos as any, target: target as any, fov: keys(lt, [[0, 34], [4.7, 30]]), bokeh: 2.6, focusRange: 0.5,
    focus: keys(lt, [[0, 1.0], [1.15, 0.95], [IMPACT, 0.95], [3.0, 1.6], [4.7, 0.95]]) };
});

function Drop() {
  const shard = useRef<THREE.Mesh>(null!);
  const drop = useRef<THREE.Mesh>(null!);
  const shardMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#c9cdd3', metalness: 1, roughness: 0.25, clearcoat: 0.6 }), []);
  const dropMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#c98a3a', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.45,
    emissive: '#7a4512', emissiveIntensity: 0.7, sheen: 0.3, envMapIntensity: 4,
  }), []);
  useSceneFrame('s06', (lt) => {
    // a peça metálica flutua em direção à câmera e gira
    const k = ease.out(clamp(lt / 1.0));
    shard.current.position.set(lerp(0.25, 0, k), lerp(1.65, 1.42, k), lerp(1.4, DROP_Z, k));
    shard.current.rotation.set(lt * 2.2, lt * 3.1, lt * 1.3);
    const morph = ease.inOut(clamp((lt - 0.7) / 0.5));
    shard.current.scale.setScalar(Math.max(0.0001, 0.05 * (1 - morph)));
    // gota âmbar
    const y = dropY(lt);
    const falling = clamp((lt - 1.15) / (IMPACT - 1.15));
    const splash = clamp((lt - IMPACT) / 0.12);
    drop.current.visible = lt > 0.7 && lt < IMPACT + 0.12;
    drop.current.position.set(DROP_X, y + 0.035, DROP_Z);
    const stretch = 1 + falling * 0.35 * (1 - splash);
    drop.current.scale.set(0.045 * morph / Math.sqrt(stretch) * (1 + splash * 1.8), 0.045 * morph * stretch * (1 - splash * 0.9), 0.045 * morph / Math.sqrt(stretch) * (1 + splash * 1.8));
  });
  return (
    <>
      <mesh ref={shard} material={shardMat}><tetrahedronGeometry args={[1, 0]} /></mesh>
      <mesh ref={drop} material={dropMat}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
    </>
  );
}

export function Scene06Transition() {
  useDirector('s06', (lt) => {
    const glow = ease.inOut(clamp((lt - IMPACT) / 2.4));
    fx.fade = keys(lt, [[0, 1], [0.35, 0, ease.out]]);
    fx.amber = glow;
    rig.key.intensity = 0;
    rig.rimL.intensity = lerp(25, 140, glow); rig.rimL.color = '#f1f3f7'; rig.rimL.pos = [-2.4, 2.4, -2.2]; rig.rimL.target = [0, 0.7, 0];
    rig.rimR.intensity = lerp(25, 150, glow); rig.rimR.color = '#e6bd85'; rig.rimR.pos = [2.4, 2.2, -2.2]; rig.rimR.target = [0, 0.7, 0];
    rig.top.intensity = 30; rig.top.angle = 0.2; rig.top.pos = [0, 5, DROP_Z]; rig.top.target = [0, 0.5, DROP_Z];
    rig.sweep.intensity = 0;
    rig.fill = 0.03; rig.floor = keys(lt, [[0, 0], [3.4, 0], [4.7, 0.8]]);
    rig.dust = lerp(0.1, 0.55, glow); rig.dustColor = '#ffdcae';
    rig.glow = lerp(0, 0.9, glow); rig.glowColor = '#3a2a18'; rig.glowPos = [0, 0.9, -4];
    fx.envIntensity = lerp(0.15, 0.6, glow); fx.bloom = lerp(0.7, 0.9, glow); fx.vignette = 0.75; fx.exposure = 1;
  });
  return (
    <SceneRoot id="s06">
      <Drop />
      <Ripples t0={t0 + IMPACT} count={6} maxR={1.9} color="#E2BE86" position={[DROP_X, SURFACE_Y, DROP_Z]} />
      <ScentTrails origin={[DROP_X, SURFACE_Y, DROP_Z]} count={9} seed={8} radius={0.5} height={1.4} turns={1.2} thickness={0.0016}
        progressFn={(t) => ease.out(clamp((t - (t0 + IMPACT + 0.1)) / 2.2))}
        alphaFn={(t) => 1 - clamp((t - (t0 + 4.1)) / 0.6)} />
      <Hud>
        <HudTitle y={0.64} lines={[
          { text: 'O QUE DEVE', at: t0 + 0.55, out: t0 + 2.2, size: 0.068, weight: 'black' },
          { text: 'DEIXAR RASTRO…', at: t0 + 0.75, out: t0 + 2.25, size: 0.068, weight: 'black' },
        ]} />
        <HudTitle y={0.64} lines={[
          { text: 'É A FRAGRÂNCIA.', at: t0 + 2.45, out: t0 + 4.4, size: 0.068, weight: 'black', material: 'amber' },
        ]} />
      </Hud>
    </SceneRoot>
  );
}
