/** Ajustes de qualidade via URL (exportação/diagnóstico). Ex.: ?render&msaa=0&reflect=256&dof=0 */
const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
export const quality = {
  msaa: num('msaa', 4),          // amostras MSAA do pós-processamento
  aa: num('aa', 1) === 1,        // antialias do contexto (camada de títulos)
  reflect: num('reflect', 512),  // resolução do piso refletivo (0 = sem reflexo)
  dof: num('dof', 1) === 1,      // profundidade de campo
  dofRes: num('dofres', 0.75),   // resolução relativa do desfoque
  smaa: num('smaa', 0) === 1,    // antialiasing pós-processo (alternativa barata ao MSAA)
};
