/** Card físico de vidro escurecido: espessura real, borda com highlight e texto 3D sobre a face. */
import type { GroupProps } from '@react-three/fiber';
import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { Text3D, textMaterials, Weight } from './Text3D';

export interface GlassCardProps {
  w?: number; h?: number; d?: number; label?: string; size?: number; weight?: Weight; tracking?: number;
  sub?: string; tint?: string; edge?: string;
}

export const GlassCard3D = forwardRef<THREE.Group, GlassCardProps & GroupProps>(function GlassCard3D(
  { w = 1.2, h = 0.42, d = 0.035, label, size = 0.13, weight = 'bold', tracking = 0.04, sub, tint = '#0d0f13', edge = '#CDD0D5', ...props },
  ref,
) {
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: tint, roughness: 0.08, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04,
    transparent: true, opacity: 0.78, envMapIntensity: 1.4,
  }), [tint]);
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ color: edge, side: THREE.BackSide, transparent: true, opacity: 0.55, toneMapped: false }), [edge]);
  const txt = useMemo(() => textMaterials.ice(), []);
  const subMat = useMemo(() => textMaterials.graphite(), []);
  return (
    <group ref={ref} {...props}>
      <RoundedBox args={[w + 0.012, h + 0.012, d * 0.6]} radius={Math.min(0.05, h / 4)} smoothness={4} material={rim} />
      <RoundedBox args={[w, h, d]} radius={Math.min(0.045, h / 4)} smoothness={4} material={glass} />
      {label && (
        <Text3D text={label} size={size} weight={weight} tracking={tracking} depth={0.06} bevel={0.006} material={txt}
          position={[0, sub ? h * 0.12 : 0, d / 2 + 0.004]} />
      )}
      {sub && <Text3D text={sub} size={size * 0.42} weight="medium" tracking={0.12} depth={0.03} bevel={0} material={subMat}
        position={[0, -h * 0.26, d / 2 + 0.004]} />}
    </group>
  );
});
