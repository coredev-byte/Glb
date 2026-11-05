/** CENA 03 — "O MESMO PERFUME. PREÇOS MUITO DIFERENTES." Sete colunas físicas, uma por anúncio do mesmo SKU. */
import { BarChart3D, barH, barX } from '../components/BarChart3D';
import { ProductModel } from '../components/ProductModel';
import { BlobShadow } from '../components/LuxuryPedestal';
import { Hud } from '../components/Hud';
import { HudTitle } from '../components/Typography';
import { registerShot, Pose } from '../components/CameraRig';
import { SceneRoot, T, useDirector } from './common';
import { rig } from '../engine/rig';
import { fx } from '../engine/fx';
import { keys } from '../motion/sequencing';
import { clamp, ease } from '../motion/easings';
import { pricingStats } from '../config/pricing-data';

export const CHART = { spacing: 0.46, width: 0.3, maxHeight: 2.4 };
export const chartData = pricingStats.sorted.map((s) => ({ label: s.store, value: s.price }));
const N = chartData.length;
const t0 = T('s03');
export const growStart = (i: number) => t0 + 0.72 + i * 0.4;
export const ASAD_POS: [number, number, number] = [-2.45, 0, 0.85];
export const colTop = (i: number) => barH(chartData[i].value, pricingStats.max, CHART.maxHeight);

registerShot('s03', (lt): Pose => {
  const track = (x: number) => x;
  const camX = keys(lt, [[0, -2.75], [0.7, -1.95, ease.inOut], [3.4, track(1.7), ease.inOut]]);
  const pos = keys<number[]>(lt, [
    [0, [-3.3, 0.95, 3.6]],
    [0.7, [camX, 1.25, 3.3], ease.inOut],
    [3.4, [1.7, 1.55, 3.4], ease.inOut],
    [5.3, [0, 1.75, 11.2], ease.luxe],
    [6.1, [0, 1.72, 10.9]],
  ]);
  const target = keys<number[]>(lt, [
    [0, [-2.4, 0.6, 0.85]],
    [0.7, [-1.6, 1.0, 0], ease.inOut],
    [3.4, [1.45, 1.35, 0], ease.inOut],
    [5.3, [0, 1.12, 0], ease.luxe],
  ]);
  return { pos: pos as any, target: target as any, fov: keys(lt, [[0, 34], [3.4, 36], [5.3, 38]]), bokeh: keys(lt, [[0, 1.6], [4, 0.4]]), focusRange: 2.2 };
});

export function Scene03Comparison() {
  useDirector('s03', (lt) => {
    rig.key.intensity = 36; rig.key.pos = [-2, 4.2, 4]; rig.key.target = [0, 1, 0]; rig.key.color = '#f4f4f1';
    rig.rimL.intensity = 80; rig.rimL.pos = [-4, 3, -2.5]; rig.rimL.target = [0, 1.2, 0]; rig.rimL.color = '#e6ecff';
    rig.rimR.intensity = 80; rig.rimR.pos = [4, 3, -2.5]; rig.rimR.target = [0, 1.2, 0]; rig.rimR.color = '#e6ecff';
    // luz direcional lateral que acompanha a formação das colunas
    rig.sweep.intensity = 160; rig.sweep.angle = 0.3; rig.sweep.color = '#ffffff';
    rig.sweep.pos = [keys(lt, [[0.6, -3.5], [3.5, 3.5]]), 2.6, 1.8]; rig.sweep.target = [keys(lt, [[0.6, -1.6], [3.5, 1.6]]), 1, 0];
    rig.top.intensity = 18; rig.top.pos = [0, 6, 1]; rig.top.target = [0, 0, 0];
    rig.fill = 0.2; rig.fillColor = '#9fb0ff'; rig.floor = 1; rig.dust = 0.35; rig.dustColor = '#f4f4f1';
    rig.glow = 0.55; rig.glowColor = '#1b1f28'; rig.glowPos = [0, 1.4, -8];
    fx.envIntensity = 0.8; fx.bloom = 0.6; fx.vignette = 0.6; fx.exposure = 1;
  });

  const growFn = (i: number, t: number) => ease.overshoot(clamp((t - growStart(i)) / 0.55));
  const highlightFn = (i: number, t: number) =>
    i === 0 ? ease.out(clamp((t - (t0 + 2.6)) / 0.4)) : i === N - 1 ? ease.out(clamp((t - (t0 + 4.9)) / 0.4)) : 0;
  const labelScaleFn = (i: number, t: number) => {
    const wide = ease.inOut(clamp((t - (t0 + 3.7)) / 1.4));
    return i === 0 || i === N - 1 ? 1 + wide * 0.6 : 1 - wide * 0.25;
  };
  const labelFn = (i: number, t: number) => (i === 0 || i === N - 1 ? 1 : 1 - 0.0 * clamp((t - (t0 + 4)) / 1));
  return (
    <SceneRoot id="s03">
      <group position={ASAD_POS} rotation-y={0.35}>
        <ProductModel id="asad" />
        <BlobShadow size={0.9} />
      </group>
      <BarChart3D data={chartData} {...CHART} growFn={growFn} highlightFn={highlightFn} labelFn={labelFn} labelScaleFn={labelScaleFn}
        countT={(i) => [growStart(i), growStart(i) + 0.55]}
        connectorFn={(t) => ease.inOut(clamp((t - (t0 + 3.5)) / 1.3))} />
      <Hud>
        <HudTitle y={0.66} lines={[
          { text: 'O MESMO PERFUME.', at: t0 + 0.25, out: t0 + 5.85, size: 0.066, weight: 'black' },
          { text: 'PREÇOS MUITO DIFERENTES.', at: t0 + 1.9, out: t0 + 5.9, size: 0.036, weight: 'medium', tracking: 0.1, material: 'silver' },
        ]} />
      </Hud>
    </SceneRoot>
  );
}

export { barX, N as CHART_N };
