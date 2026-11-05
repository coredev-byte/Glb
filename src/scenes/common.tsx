import { ReactNode, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { clock } from '../engine/clock';
import { scene, sceneAt, SceneId } from '../config/timeline';

/** Grupo que só existe na janela da cena (com pre/pós-roll opcionais para transições). */
export function SceneRoot({ id, pre = 0, post = 0, children }: { id: SceneId; pre?: number; post?: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  const s = scene(id);
  useFrame(() => { const t = clock.t; g.current.visible = t >= s.start - pre && t < s.end + post; }, -2.6);
  return <group ref={g}>{children}</group>;
}

/** "Diretor" da cena: escreve rig de luzes e fx apenas enquanto a cena está ativa. */
export function useDirector(id: SceneId, fn: (lt: number, dur: number, t: number) => void) {
  const s = scene(id);
  useFrame(() => {
    const t = clock.t;
    if (sceneAt(t).id !== id) return;
    fn(t - s.start, s.end - s.start, t);
  }, -2.5);
}

/** Atualização por frame com tempo local da cena (só quando visível). */
export function useSceneFrame(id: SceneId, fn: (lt: number, t: number) => void, pre = 0, post = 0) {
  const s = scene(id);
  useFrame(() => {
    const t = clock.t;
    if (t < s.start - pre || t >= s.end + post) return;
    fn(t - s.start, t);
  });
}

export const T = (id: SceneId) => scene(id).start;
