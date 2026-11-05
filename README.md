# LR Imports — Motion 3D Cinematográfico

Assets 3D do comercial "Deixe o rastro para a fragrância. Não para o preço."
Esta etapa entrega os **modelos GLB**. O comercial (React + Three.js / R3F, cenas 01–10) é construído em cima destes arquivos.

## Modelos

| Arquivo | O que é | Origem |
|---|---|---|
| `public/models/asad.glb` | Lattafa Asad EDP 100 ml (cenas 1–6) | Fornecido pela LR Imports (gerado no Tripo), sem alterações |
| `public/models/supremacy-collectors-edition.glb` | Afnan Supremacy Collector's Edition 100 ml (herói, cenas 7–10) | Procedural: `tools/glb/lib/supremacy.js` |
| `public/brand/lr-imports-logo.glb` | Logo LR Importados em 3D (ouro extrudado + selo preto) | Vetorizada da logo oficial: `tools/glb/lib/logo.js` |
| `public/brand/logo.png` | Logo com fundo transparente (overlay 2D) | `tools/glb/prep-logo.py` |

Preview: `exports/previews/glb-overview.png`.

### Convenção (todos os frascos)

- **1 unidade = altura total do frasco** (com tampa), **base em y = 0**, **frente voltada para +Z**, centralizado em X/Z.
  Assim os modelos podem ser trocados sem reprogramar as cenas.
- A logo tem **largura = 1 unidade**, centrada na origem, de pé no plano XY, frente em +Z.

### Hierarquia de nós (para animação)

```
SupremacyCollectorsEdition
├── Bottle
│   ├── Body      pedra cinza salpicada laqueada (PBR + clearcoat + normal map)
│   ├── Label     SUPREMACY / COLLECTOR'S EDITION / AFNAN (tinta prata, alpha mask)
│   └── Crest     brasão em relevo (gunmetal + normal map)
├── Collar        gargalo preto piano
└── Cap           grupo animável (tirar/girar a tampa)
    ├── CapRing   anel preto cromado
    └── CapStem   haste

LRImportsLogo
├── BadgeDisc     selo circular preto (pode ser ocultado)
└── LogoGold      letreiro "LR + frasco + IMPORTADOS" em ouro escovado
```

## Observações sobre fidelidade

- **Asad (fornecido):** é um modelo gerado por IA. Os textos "ASAD" e "Lattafa" saíram deformados na textura e o dourado
  tem aparência de creme fosco (o mapa de metalness não marca o metal). Para o comercial, o recomendado é um destes caminhos:
  ajustar o material dourado em runtime, manter o Asad mais em contraluz/silhueta nos close-ups, ou trocar por um modelo melhor
  com o mesmo nome de arquivo.
- **Supremacy:** proporções medidas sobre a foto de referência. Esta tipografia é uma aproximação feita com fontes livres
  (Cinzel / Inter Tight). O **brasão é estilizado e não é a arte oficial da Afnan**. Se houver a arte vetorial oficial, basta
  trocar a textura em `crestTextures()`.
- **Logo:** vetorizada automaticamente (potrace). O microtexto "IMPORTADOS" dentro do quadradinho do frasco é fino demais
  para o trace e foi omitido; o "LR" interno foi mantido.

## Regenerar

```bash
npm install
python3 tools/glb/prep-logo.py        # máscara + logo.png (precisa de Pillow e numpy)
node tools/glb/trace-logo.mjs         # vetoriza -> tools/glb/work/logo.svg
npm run build:glb                     # gera supremacy-collectors-edition.glb e lr-imports-logo.glb
node tools/glb/validate.mjs           # validador Khronos glTF
node tools/glb/preview.mjs supremacy-collectors-edition models exports/previews 0,35,90
```

Visualizador interativo: `node tools/glb/serve.mjs` e abrir `http://127.0.0.1:5174/tools/glb/viewer.html`.

Geração determinística: todo ruído/salpicado usa PRNG com seed fixa, então a saída é sempre a mesma.
O build roda no Chromium headless (Playwright) porque o GLTFExporter precisa de Canvas para gerar as texturas.

## Referências

`references/` contém os dois motions de referência, a foto do Supremacy e o print do perfil @lr.imports.mt.
