/** Logo oficial LR Importados em 3D (GLB extrudado da arte enviada). Só o letreiro dourado; o selo é opcional. */
import type { GroupProps } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { assets } from '../config/assets';

export function Logo3D({ badge = false, ...props }: { badge?: boolean } & GroupProps) {
  const gltf = useGLTF(assets.brand.logo3d);
  const obj = useMemo(() => {
    const c = gltf.scene.clone(true);
    c.traverse((o: any) => {
      if (o.name === 'BadgeDisc') o.visible = badge;
      if (o.isMesh && o.name === 'LogoGold') {
        const m = (o.material as THREE.MeshPhysicalMaterial).clone();
        m.emissive = new THREE.Color('#5a3f1c');
        m.emissiveIntensity = 0.35;
        o.material = m;
      }
    });
    return c;
  }, [gltf, badge]);
  return <group {...props}><primitive object={obj} /></group>;
}
