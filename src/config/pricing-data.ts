/**
 * Amostra verificável de preços — Lattafa Asad EDP 100 ml.
 * Fonte: https://paginas.farmacia-ia.com/perfumes/perfume-lattafa-asad-eau-de-parfum-masculino-arabe
 * Coleta: 28/10/2026. Atualize os valores se o anúncio for publicado depois desta data.
 *
 * Os números exibidos no comercial são CALCULADOS a partir desta lista (nada é digitado à mão).
 * A diferença entre anúncios não comprova sobrepreço, margem de lucro ou promoção falsa.
 */
export const pricingSample = {
  product: 'Lattafa Asad Eau de Parfum 100 ml',
  collectedAt: '2026-10-28',
  collectedAtLabel: '28/10/2026',
  source: 'https://paginas.farmacia-ia.com/perfumes/perfume-lattafa-asad-eau-de-parfum-masculino-arabe',
  stores: [
    { store: 'Beleza na Web', price: 199.41 },
    { store: 'AmoBeleza', price: 238.9 },
    { store: 'Época Cosméticos', price: 339.0 },
    { store: 'Drogaria Catarinense', price: 350.09 },
    { store: 'Preço Popular', price: 350.09 },
    { store: 'Drogaria Araújo', price: 359.99 },
    { store: 'Farmácia Indiana', price: 399.9 },
  ],
} as const;

const prices = pricingSample.stores.map((s) => s.price);
const round2 = (v: number) => Math.round(v * 100) / 100;

export const pricingStats = (() => {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const diff = round2(max - min);
  const pct = ((max - min) / min) * 100;
  return {
    min,
    max,
    diff,
    pct,
    pctLabel: `+${pct.toFixed(1).replace('.', ',')}%`,
    count: prices.length,
    sorted: [...pricingSample.stores].sort((a, b) => a.price - b.price),
  };
})();

export const brl = (v: number, withSymbol = true) =>
  (withSymbol ? 'R$ ' : '') + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
