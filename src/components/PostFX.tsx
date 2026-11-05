/** Acabamento: bloom controlado, profundidade de campo dirigida pelo rig, vinheta e tonemapping ACES. */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { fx } from '../engine/fx';

export function PostFX({ quality = 'high' as 'draft' | 'high' }) {
  const bloom = useRef<any>(null);
  const dof = useRef<any>(null);
  const vig = useRef<any>(null);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = fx.bloom;
    if (dof.current) {
      dof.current.cocMaterial.worldFocusDistance = fx.focus;
      dof.current.cocMaterial.worldFocusRange = fx.focusRange;
      dof.current.bokehScale = fx.bokeh;
    }
    if (vig.current) vig.current.darkness = fx.vignette;
  });
  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
      <DepthOfField ref={dof} worldFocusDistance={6} worldFocusRange={3} bokehScale={0} resolutionScale={quality === 'high' ? 0.75 : 0.5} />
      <Bloom ref={bloom} mipmapBlur intensity={0.6} luminanceThreshold={0.9} luminanceSmoothing={0.1} radius={0.72} />
      <Vignette ref={vig} offset={0.28} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
