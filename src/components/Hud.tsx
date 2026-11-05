/**
 * Camada de títulos 3D: uma cena separada, renderizada POR CIMA do filme depois do pós-processamento.
 * Assim a tipografia é 3D de verdade (volume, bevel, reflexos do mesmo ambiente), mas nunca fica atrás
 * do produto nem é borrada pela profundidade de campo.
 *
 * Coordenadas de quadro: 1 unidade = 1000 px do frame 1080×1920 (x ∈ [-0,54; 0,54], y ∈ [-0,96; 0,96]).
 */
import { ReactNode, useMemo } from 'react';
import * as THREE from 'three';
import { createPortal, useFrame, useThree } from '@react-three/fiber';

const hudScene = new THREE.Scene();
const HUD_FOV = 28;
const HUD_DEPTH = 3;
const hudCam = new THREE.PerspectiveCamera(HUD_FOV, 1080 / 1920, 0.05, 50);
const unit = (2 * HUD_DEPTH * Math.tan(THREE.MathUtils.degToRad(HUD_FOV) / 2)) / 1.92;

/** Monta a passada da camada (uma vez, depois do <PostFX/>). */
export function HudLayer() {
  const { gl, size, scene } = useThree();
  useFrame(() => {
    hudCam.aspect = size.width / size.height;
    hudCam.updateProjectionMatrix();
    hudScene.environment = scene.environment;
    hudScene.environmentIntensity = 0.85;
    const prevAuto = gl.autoClear, prevTM = gl.toneMapping;
    gl.autoClear = false;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.setRenderTarget(null);
    gl.clearDepth();
    gl.render(hudScene, hudCam);
    gl.autoClear = prevAuto;
    gl.toneMapping = prevTM;
  }, 2);
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0, 0); return o; }, []);
  return createPortal(
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-2, 3, 4]} intensity={2.2} color="#fff8ee" target={target} />
      <directionalLight position={[3, 1, -1]} intensity={1.6} color="#dfe6ff" target={target} />
      <directionalLight position={[0, -3, 2]} intensity={0.4} color="#B78C57" target={target} />
      <primitive object={target} />
    </>,
    hudScene,
  );
}

export function Hud({ children }: { depth?: number; children: ReactNode }) {
  return createPortal(
    <group position={[0, 0, -HUD_DEPTH]} scale={unit}>{children}</group>,
    hudScene,
  );
}

/** Zona segura (em unidades HUD) — evita interface do Instagram Reels e TikTok. */
export const SAFE = { top: 0.96 - 0.25, bottom: -0.96 + 0.42, left: -0.54 + 0.07, right: 0.54 - 0.14 };
