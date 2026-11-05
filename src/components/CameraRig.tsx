/**
 * Rig de câmera coreografado: cada cena registra um "shot" (função pura do tempo local) e o rig
 * aplica posição, alvo, FOV, roll e foco. Transições entre cenas podem ser cortes secos ou blends.
 */
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clock } from '../engine/clock';
import { fx } from '../engine/fx';
import { sceneAt, scenes, SceneId } from '../config/timeline';
import { clamp, ease } from '../motion/easings';

export interface Pose {
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
  roll?: number;
  focus?: number;       // distância de foco; padrão = distância até o alvo
  focusRange?: number;
  bokeh?: number;
}
export type Shot = (lt: number, dur: number) => Pose;

export const shots: Partial<Record<SceneId, { shot: Shot; blendIn?: number }>> = {};
export const registerShot = (id: SceneId, shot: Shot, blendIn = 0) => { shots[id] = { shot, blendIn }; };

const tmpUp = new THREE.Vector3();
const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), tg = new THREE.Vector3();

export function evalPose(t: number): Pose {
  const s = sceneAt(t);
  const entry = shots[s.id];
  const dur = s.end - s.start;
  const lt = t - s.start;
  const pose = entry ? entry.shot(lt, dur) : { pos: [0, 1, 6], target: [0, 1, 0] } as Pose;
  if (entry?.blendIn && lt < entry.blendIn) {
    const idx = scenes.indexOf(s);
    const prev = scenes[idx - 1];
    const pe = prev && shots[prev.id];
    if (pe) {
      const pp = pe.shot(prev.end - prev.start, prev.end - prev.start);
      const u = ease.inOut(clamp(lt / entry.blendIn));
      const mix = (a: number[], b: number[]) => a.map((x, i) => x + (b[i] - x) * u) as [number, number, number];
      return {
        ...pose,
        pos: mix(pp.pos, pose.pos),
        target: mix(pp.target, pose.target),
        fov: (pp.fov ?? 35) + ((pose.fov ?? 35) - (pp.fov ?? 35)) * u,
        roll: (pp.roll ?? 0) + ((pose.roll ?? 0) - (pp.roll ?? 0)) * u,
      };
    }
  }
  return pose;
}

export function CameraRig() {
  useFrame(({ camera }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const p = evalPose(clock.t);
    v0.set(...p.pos);
    tg.set(...p.target);
    cam.position.copy(v0);
    cam.up.set(0, 1, 0);
    cam.lookAt(tg);
    if (p.roll) cam.rotateZ(p.roll);
    const fov = p.fov ?? 35;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    fx.focus = p.focus ?? v1.copy(tg).sub(v0).length();
    fx.focusRange = p.focusRange ?? 2.5;
    fx.bokeh = p.bokeh ?? 0;
    tmpUp.set(0, 1, 0);
  }, -3);
  return null;
}
