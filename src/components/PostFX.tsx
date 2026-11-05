/** Acabamento: bloom controlado, profundidade de campo dirigida pelo rig, vinheta e tonemapping ACES. */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { fx } from '../engine/fx';
import { quality as Q } from '../engine/quality';

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
    <EffectComposer multisampling={quality === 'high' ? Q.msaa : 0} enableNormalPass={false}>
      {Q.dof ? <DepthOfField ref={dof} worldFocusDistance={6} worldFocusRange={3} bokehScale={0} resolutionScale={quality === 'high' ? Q.dofRes : 0.5} /> : <></>}
      <Bloom ref={bloom} mipmapBlur intensity={0.6} luminanceThreshold={0.9} luminanceSmoothing={0.1} radius={0.72} />
      <Vignette ref={vig} offset={0.28} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {Q.smaa ? <SMAA /> : <></>}
    </EffectComposer>
  );
}
