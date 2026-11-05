/** CENA 10 — Assinatura: "DEIXE O RASTRO PARA A FRAGRÂNCIA. NÃO PARA O PREÇO." + logo LR + CTA. */
import { useMemo, useRef } from 'react';
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
import { clamp, ease, lerp } from '../motion/easings';

const t0 = T('s10');

registerShot('s10', (lt): Pose => {
  const u = ease.soft(clamp(lt / 4.55));
  // movimento final quase imperceptível
  return { pos: [lerp(0.06, 0.0, u), lerp(0.5, 0.54, u), lerp(5.5, 5.35, u)], target: [0, 0.29, 0], fov: 34, bokeh: 1.0, focusRange: 1.4 };
}, 0.6);

/** Horizonte curvo luminoso com grade de pontos — inspirado na linguagem espacial das referências. */
function Horizon() {
  const g = useRef<THREE.Mesh>(null!);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vP;
      void main(){ vN = normalize(normalMatrix * normal); vP = position; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uA; uniform float uT; varying vec3 vN; varying vec3 vW; varying vec3 vP;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec3 N = normalize(vN);
        float rim = pow(1.0 - abs(dot(N, vec3(0.0,0.0,1.0))), 9.0);
        vec3 sp = normalize(vP);
        float lon = atan(sp.z, sp.x), lat = asin(sp.y);
        vec2 grid = vec2(lon * 90.0, lat * 90.0 + uT * 0.4);
        vec2 f = abs(fract(grid) - 0.5);
        float dots = smoothstep(0.12, 0.0, length(f));
        vec3 silver = vec3(0.80, 0.82, 0.84), amber = vec3(0.90, 0.72, 0.48);
        vec3 col = mix(silver, amber, 0.55) * rim * 1.8 + silver * dots * 0.35 * (0.25 + rim);
        gl_FragColor = vec4(col * uA, (rim * 0.9 + dots * 0.25) * uA);
      }`,
  }), []);
  useFrame(() => {
    const t = clock.t;
    mat.uniforms.uA.value = ease.inOut(clamp((t - t0 + 0.2) / 1.0));
    mat.uniforms.uT.value = t;
    g.current.visible = t > t0 - 0.3;
  });
  return <mesh ref={g} material={mat} position={[0, -8.35, -9]}><sphereGeometry args={[8, 192, 96]} /></mesh>;
}

function LogoEnd({ at }: { at: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(() => {
    const t = clock.t;
    const k = ease.out(clamp((t - at) / 0.9));
    g.current.visible = t > at;
    g.current.position.y = -0.255 - (1 - k) * 0.03;
    g.current.rotation.x = (1 - k) * 0.5;
    g.current.scale.setScalar(Math.max(0.001, 0.2 * (0.92 + 0.08 * k)));
  });
  return <group ref={g}><Logo3D /></group>;
}

export function Scene10CTA() {
  useDirector('s10', (lt) => {
    rig.key.intensity = 26; rig.key.pos = [1.2, 2.6, 3.4]; rig.key.target = [0, 0.7, 0]; rig.key.color = '#fff4e6';
    rig.rimL.intensity = 130; rig.rimL.color = '#f3f5fa'; rig.rimL.pos = [-2.2, 2.2, -2.4]; rig.rimL.target = [0, 0.7, 0];
    rig.rimR.intensity = 130; rig.rimR.color = '#e6bd85'; rig.rimR.pos = [2.4, 2.0, -2.2]; rig.rimR.target = [0, 0.7, 0];
    rig.sweep.intensity = 0; rig.top.intensity = 18;
    rig.fill = 0.12; rig.floor = lerp(0.9, 0.0, ease.inOut(clamp(lt / 0.8))); rig.dust = 0.4;
    rig.glow = 0.7; rig.glowColor = '#2e2416'; rig.glowPos = [0, 0.2, -10];
    fx.envIntensity = 1.0; fx.bloom = 0.85; fx.vignette = 0.6; fx.exposure = 1; fx.fade = 0; fx.amber = 1;
  });
  return (
    <SceneRoot id="s10" pre={0.6}>
      <Horizon />
      <Hud>
        <HudTitle y={0.72} lines={[
          { text: 'DEIXE O RASTRO', at: t0 + 0.05, size: 0.06, weight: 'black' },
          { text: 'PARA A FRAGRÂNCIA.', at: t0 + 0.25, size: 0.06, weight: 'black' },
        ]} />
        <HudTitle y={0.565} lines={[
          { text: 'NÃO PARA O PREÇO.', at: t0 + 1.45, size: 0.044, weight: 'bold', tracking: 0.05, material: 'amber' },
        ]} />
        <LogoEnd at={t0 + 0.15} />
      </Hud>
    </SceneRoot>
  );
}
