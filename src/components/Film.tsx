/** O filme: um único Canvas 9:16 com estúdio, câmera coreografada, as 10 cenas e o acabamento. */
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Studio } from './Studio';
import { PostFX } from './PostFX';
import { HudLayer } from './Hud';
import { clock, isRenderMode } from '../engine/clock';
import { DURATION } from '../config/timeline';
import { Scene01Hook } from '../scenes/Scene01Hook';
import { Scene02Offer } from '../scenes/Scene02Offer';
import { Scene03Comparison } from '../scenes/Scene03Comparison';
import { Scene04Index } from '../scenes/Scene04Index';
import { Scene05Reframe } from '../scenes/Scene05Reframe';
import { Scene06Transition } from '../scenes/Scene06Transition';
import { HeroSet } from '../scenes/HeroSet';
import { Scene07Reveal } from '../scenes/Scene07Reveal';
import { Scene08Notes } from '../scenes/Scene08Notes';
import { Scene09Value } from '../scenes/Scene09Value';
import { Scene10CTA } from '../scenes/Scene10CTA';

/** Avança o relógio no preview (no modo render o tempo é definido frame a frame de fora). */
function ClockDriver({ audio }: { audio?: HTMLAudioElement | null }) {
  useFrame((_, delta) => {
    if (isRenderMode || !clock.playing) return;
    let t: number;
    if (audio && !audio.paused && clock.rate === 1) t = audio.currentTime;
    else t = clock.t + Math.min(delta, 0.1) * clock.rate;
    if (t >= DURATION) { t = DURATION - 1e-3; clock.playing = false; audio?.pause(); }
    clock.set(t);
  }, -10);
  return null;
}

function Ready() {
  const { gl } = useThree();
  useEffect(() => {
    (window as any).__ready = true;
    (window as any).__gl = gl;
  }, [gl]);
  return null;
}

export function Film({ quality = 'high', audio }: { quality?: 'draft' | 'high'; audio?: HTMLAudioElement | null }) {
  const dpr = isRenderMode ? 1 : quality === 'high' ? Math.min(window.devicePixelRatio, 1.5) : 0.6;
  return (
    <Canvas
      dpr={dpr}
      frameloop={isRenderMode ? 'never' : 'always'}
      camera={{ fov: 35, near: 0.03, far: 200, position: [0, 1, 5] }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: isRenderMode, alpha: false }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <ClockDriver audio={audio} />
      <Suspense fallback={null}>
        <CameraRig />
        <Studio />
        <Scene01Hook />
        <Scene02Offer />
        <Scene03Comparison />
        <Scene04Index />
        <Scene05Reframe />
        <Scene06Transition />
        <HeroSet />
        <Scene07Reveal />
        <Scene08Notes />
        <Scene09Value />
        <Scene10CTA />
        <PostFX quality={quality} />
        <HudLayer />
        <Ready />
      </Suspense>
    </Canvas>
  );
}
