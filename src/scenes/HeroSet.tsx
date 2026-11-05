/**
 * Set do produto herói, contínuo da cena 6 à 10: Supremacy Collector's Edition sobre o pedestal.
 * Mantido como um único objeto para que câmera e luz façam transições sem cortes de continuidade.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProductModel } from '../components/ProductModel';
import { BlobShadow, LuxuryPedestal } from '../components/LuxuryPedestal';
import { clock } from '../engine/clock';
import { T } from './common';
import { keys } from '../motion/sequencing';
import { ease } from '../motion/easings';

export const PED_H = 0.16;
export const HERO_FROM = T('s06') + 2.3;

export const heroRotY = (t: number) => keys(t, [
  [HERO_FROM, -0.55],
  [T('s07'), -0.32, ease.inOut],
  [T('s08'), 0.12, ease.soft],
  [T('s09'), 1.35, ease.inOut],
  [T('s09') + 1.4, 0.18, ease.inOut],
  [T('s10'), 0.0, ease.soft],
  [T('s10') + 4.5, 0.06],
]);

export function HeroSet() {
  const g = useRef<THREE.Group>(null!);
  const bottle = useRef<THREE.Group>(null!);
  useFrame(() => {
    const t = clock.t;
    g.current.visible = t >= HERO_FROM;
    if (!g.current.visible) return;
    bottle.current.rotation.y = heroRotY(t);
    bottle.current.position.y = PED_H + Math.sin(t * 0.9) * 0.004;
  });
  return (
    <group ref={g}>
      <LuxuryPedestal radius={0.62} height={PED_H} glowColor="#E6C08A"
        glowFn={(t) => keys(t, [[T('s07') + 0.6, 0], [T('s07') + 1.6, 1]])} spin={0.12} />
      <BlobShadow size={0.75} y={PED_H + 0.002} opacity={0.85} />
      <group ref={bottle}><ProductModel id="supremacy" /></group>
    </group>
  );
}
