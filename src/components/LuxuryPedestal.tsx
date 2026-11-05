/** Pedestal circular de luxo: laca preta, anel de luz embutido, rotação opcional e sombra de contato suave. */
import type { GroupProps } from '@react-three/fiber';
import { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { clock } from '../engine/clock';

export function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)');
  gr.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function BlobShadow({ size = 0.9, opacity = 0.9, y = 0.002 }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity }), [opacity]);
  return <mesh rotation-x={-Math.PI / 2} position-y={y} material={mat} renderOrder={1}><planeGeometry args={[size, size]} /></mesh>;
}

export interface PedestalProps { radius?: number; height?: number; glowColor?: string; glowFn?: (t: number) => number; spin?: number }

export const LuxuryPedestal = forwardRef<THREE.Group, PedestalProps & GroupProps>(function LuxuryPedestal(
  { radius = 0.85, height = 0.16, glowColor = '#E6C08A', glowFn, spin = 0.1, ...props }, ref,
) {
  const top = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.MeshBasicMaterial>(null!);
  const ring2 = useRef<THREE.MeshBasicMaterial>(null!);
  const lacquer = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#08090b', roughness: 0.18, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05 }), []);
  const brushed = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#2a2c31', roughness: 0.35, metalness: 1 }), []);
  useFrame(() => {
    const t = clock.t;
    top.current.rotation.y = t * spin;
    const g = glowFn ? glowFn(t) : 1;
    ring.current.opacity = g;
    ring2.current.opacity = g * 0.35;
  });
  return (
    <group ref={ref} {...props}>
      <mesh material={lacquer} position-y={height / 2} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.02, height, 96, 1]} />
      </mesh>
      <mesh material={brushed} position-y={height * 0.18}>
        <cylinderGeometry args={[radius * 1.035, radius * 1.05, height * 0.36, 96, 1]} />
      </mesh>
      <group ref={top} position-y={height + 0.001}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[radius * 0.9, radius * 0.905, 128]} />
          <meshBasicMaterial ref={ring} color={glowColor} transparent toneMapped={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[radius * 0.6, radius * 0.603, 128, 1, 0, Math.PI * 1.4]} />
          <meshBasicMaterial ref={ring2} color={glowColor} transparent toneMapped={false} />
        </mesh>
      </group>
      <mesh position-y={height * 0.5} rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 1.003, 0.004, 8, 160]} />
        <meshBasicMaterial color={glowColor} toneMapped={false} />
      </mesh>
    </group>
  );
});
