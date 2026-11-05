/** Identidade e campos editáveis da LR Imports. */
export const palette = {
  black: '#060709',
  graphite: '#101216',
  ice: '#F4F4F1',
  metal: '#9298A3',
  silver: '#CDD0D5',
  amber: '#B78C57',
  gold: '#D9AD62', // dourado da logo oficial
} as const;

export const brand = {
  name: 'LR Imports',
  legalName: 'LR Importados',
  instagram: '@lr.imports.mt', // perfil oficial (print enviado pela LR Imports)
  whatsapp: null as string | null, // [PREENCHER] — não exibido enquanto for null
  tagline: 'PERFUMES ÁRABES SELECIONADOS.',
  cta: 'FALE COM A LR IMPORTS',
  /**
   * [PRECO_REAL_SUPREMACY_LR] — preço oficial do Supremacy Collector's Edition 100 ml na LR Imports.
   * Enquanto for null, a cena 9 NÃO mostra etiqueta de preço (nada de preço inventado).
   * Exemplo: 349.9
   */
  priceSupremacy: null as number | null,
  /**
   * Comparação documentada do MESMO Supremacy 100 ml em outra loja (só preencha com evidência).
   * Ex.: { store: 'Loja X', price: 499.9, date: '05/11/2026' }
   */
  supremacyComparable: null as null | { store: string; price: number; date: string },
};

/** Notas olfativas oficiais (afnan.com/products/supremacy-collectors-edition). */
export const supremacyNotes = {
  top: ['Abacaxi', 'Bergamota', 'Maçã', 'Flores brancas'],
  heart: ['Flor de laranjeira', 'Bétula', 'Âmbar'],
  base: ['Musgo de carvalho', 'Almíscar', 'Âmbar-gris'],
  source: 'https://afnan.com/products/supremacy-collectors-edition',
} as const;
