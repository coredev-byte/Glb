/**
 * Carrega os GLBs dos perfumes (convenção: altura = 1, base em y=0, frente +Z) e corrige materiais
 * sem alterar a identidade: o Asad recebe dourado metálico onde a textura é creme/dourada e verniz
 * no vidro preto; o Supremacy é usado como vem.
 */
import type { GroupProps } from '@react-three/fiber';
import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { assets } from '../config/assets';

export type ProductId = 'asad' | 'supremacy';

function upgradeAsad(root: THREE.Object3D) {
  root.traverse((o: any) => {
    if (!o.isMesh || o.userData.lrFixed) return;
    o.userData.lrFixed = true;
    const src = o.material as THREE.MeshStandardMaterial;
    const m = new THREE.MeshPhysicalMaterial({
      map: src.map, normalMap: src.normalMap, roughnessMap: src.roughnessMap, metalnessMap: src.metalnessMap,
      roughness: 1, metalness: 1, clearcoat: 0.8, clearcoatRoughness: 0.12, name: 'AsadUpgraded',
    });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
          float lrLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float lrWarm = diffuseColor.r - diffuseColor.b;
          float lrGold = smoothstep(0.30, 0.55, lrLum) * smoothstep(-0.02, 0.10, lrWarm + 0.06);
          vec3 lrGoldCol = vec3(0.86, 0.66, 0.36) * (0.75 + 0.45 * lrLum);
          diffuseColor.rgb = mix(diffuseColor.rgb, lrGoldCol, lrGold);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = mix(min(metalnessFactor, 0.15), 1.0, lrGold);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(clamp(roughnessFactor, 0.12, 0.35), 0.26, lrGold);`);
    };
    o.material = m;
  });
}

export function useProduct(id: ProductId) {
  const gltf = useGLTF(id === 'asad' ? assets.models.asad : assets.models.supremacy);
  return useMemo(() => {
    if (id === 'asad') upgradeAsad(gltf.scene);
    const c = gltf.scene.clone(true);
    c.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; } });
    return c;
  }, [gltf, id]);
}

export const ProductModel = forwardRef<THREE.Group, { id: ProductId; scale?: number } & Omit<GroupProps, 'scale' | 'id'>>(
  function ProductModel({ id, scale = 1, ...props }, ref) {
    const obj = useProduct(id);
    return (
      <group ref={ref} {...props}>
        <primitive object={obj} scale={scale} />
      </group>
    );
  },
);

useGLTF.preload(assets.models.asad);
useGLTF.preload(assets.models.supremacy);
useGLTF.preload(assets.brand.logo3d);
