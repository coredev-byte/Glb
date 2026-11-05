/** Parâmetros globais de "fotografia" escritos pelas cenas a cada frame e lidos pelo pós-processamento. */
export const fx = {
  focus: 6,        // distância de foco (mundo)
  focusRange: 3,   // faixa nítida
  bokeh: 0,        // 0 = sem desfoque
  bloom: 0.6,
  exposure: 1,
  vignette: 0.55,
  envIntensity: 1,
  amber: 0,        // 0..1 — quanto do âmbar/prata da segunda metade já entrou
  fade: 0,         // 0..1 — fade para preto global (cortes)
};

export function resetFx() {
  fx.bokeh = 0; fx.bloom = 0.6; fx.exposure = 1; fx.vignette = 0.55; fx.envIntensity = 1; fx.fade = 0;
}
