# LR Imports — Motion 3D Cinematográfico

Comercial vertical **"Deixe o rastro para a fragrância. Não para o preço."**
9:16 · 1080×1920 · 30 fps · 47,5 s · H.264 + AAC 48 kHz · locução do Marcio (ElevenLabs).

Sequência: curiosidade → desconfiança → evidência (dados reais) → surpresa → desejo (Supremacy) → conversão.

## Rodar

```bash
npm install
npm run dev            # preview em http://127.0.0.1:5173
```

Preview: play/pause (espaço), timeline arrastável, frame exato (←/→, Shift = 1 s), seletor das 10 cenas,
câmera lenta (0,25× / 0,5×), qualidade rascunho/final, zona segura do Reels/TikTok, legenda da locução atual.

## Exportar

```bash
# frames numerados (retomável; 2 processos em paralelo aproveitam melhor a CPU)
node tools/render/render.mjs --frames --from 0 --to 713
node tools/render/render.mjs --frames --from 713 --to 1425
# monta o MP4 final (vídeo + mix normalizado a −14 LUFS)
node tools/render/render.mjs --encode
# stills para revisão
node tools/render/render.mjs --stills 1.5,15.5,28.6 --out exports/stills
```

Saída: `exports/lr-imports-supremacy-1080x1920.mp4`.
A renderização é determinística: cada frame define o relógio global (`src/engine/clock.ts`) e o R3F renderiza
exatamente aquele instante (câmera, partículas, luzes, números). Funciona sem GPU (SwiftShader, ~3 s/frame por processo).
Qualidade da exportação: `?render&msaa=0&dofres=0.4&smaa=1` (ajustável com `--query`).

## Áudio

```bash
npm run audio          # python3 tools/audio/build_audio.py  (precisa de numpy + scipy)
```

- `public/audio/narration/marcio-take1.mp3` — locução bruta (Marcio - Viral Hook Narrator, eleven_v4, com tags de emoção)
- `public/audio/narration.wav` · `music.wav` · `sfx.wav` · `mix.wav` — stems editados na timeline (48 kHz / 24-bit)
- Trilha e efeitos são **originais**, sintetizados de forma determinística a partir dos cues de `src/config/timeline.json`.
- Para trocar a locução: substitua o arquivo, ajuste `narration.edit`/`vo` no `timeline.json` e rode `npm run audio`.

Roteiro completo com tempos, interpretação e textos em tela: [`docs/roteiro-locucao.md`](docs/roteiro-locucao.md).

## Campos editáveis — `src/config/brand.ts`

| Campo | Estado | Efeito |
|---|---|---|
| `priceSupremacy` | **null** (não confirmado) | Cena 9 só mostra a etiqueta 3D de preço quando preenchido |
| `supremacyComparable` | null | Só preencher com evidência documentada do MESMO Supremacy 100 ml |
| `whatsapp` | null | Aparece no CTA final quando preenchido |
| `instagram` | `@lr.imports.mt` | Perfil oficial (print enviado) |

## Dados e integridade

`src/config/pricing-data.ts` — Lattafa Asad EDP 100 ml, 7 lojas, coleta 28/10/2026.
Fonte: https://paginas.farmacia-ia.com/perfumes/perfume-lattafa-asad-eau-de-parfum-masculino-arabe

Valores exibidos são **calculados** da lista: menor R$ 199,41 · maior R$ 399,90 · diferença R$ 200,49 · +100,5% · 7 lojas.
O comercial não afirma margem, abuso, falsificação nem que a LR Imports é a mais barata; não usa o preço do Asad
para falar do Supremacy. Os nomes das lojas não aparecem na tela (só no arquivo de dados), para não sugerir acusação.
**Atualize os preços se o anúncio for publicado depois da data da coleta.**

Notas olfativas do Supremacy: fonte oficial https://afnan.com/products/supremacy-collectors-edition

## Estrutura

```
src/
  config/        brand.ts · pricing-data.ts · timeline.json/.ts · assets.ts
  engine/        clock.ts (relógio único) · fx.ts (foco/bloom/exposição) · rig.ts (luzes) · quality.ts
  motion/        easings.ts (cubic-bezier) · sequencing.ts (keys, janelas, PRNG)
  components/    Text3D (tipografia extrudada) · AnimatedNumber3D (contador + dígitos mecânicos) · BarChart3D
                 GlassCard3D · ScentTrails/Ripples · FragranceNotes3D · LuxuryPedestal · CameraRig · Hud (títulos)
                 Studio (luzes, ambiente, piso refletivo, poeira) · PostFX · Overlay2D (rodapés/CTA) · Film
  scenes/        Scene01Hook … Scene10CTA · HeroSet (Supremacy contínuo da cena 6 à 10)
public/
  models/        asad.glb (fornecido) · supremacy-collectors-edition.glb (procedural)
  brand/         lr-imports-logo.glb · logo.png · lr-imports-logo-original.jpg
  audio/ fonts/
tools/
  glb/           gerador dos GLBs (Supremacy + logo) · preview · validação Khronos
  audio/         trilha, SFX e mix
  render/        exportação por frame (Playwright + FFmpeg)
references/      motions de referência, foto do Supremacy, print do perfil
docs/            roteiro de locução e timeline
```

## Modelos 3D

Convenção para trocar modelos sem reprogramar cenas: **altura total = 1 unidade, base em y = 0, frente para +Z**.

- `asad.glb` — fornecido (gerado por IA/Tripo). Textos "ASAD"/"Lattafa" da textura são imperfeitos; o dourado é
  corrigido em runtime (`ProductModel.tsx`) para metal. Substitua por um modelo melhor com o mesmo nome se tiver.
- `supremacy-collectors-edition.glb` — procedural (`tools/glb/lib/supremacy.js`), proporções da foto; o **brasão é
  estilizado, não é a arte oficial da Afnan**. Nós: `Body`, `Label`, `Crest`, `Collar`, `Cap` (`CapRing`, `CapStem`).
- `lr-imports-logo.glb` — vetorizado da logo oficial; nós `LogoGold` e `BadgeDisc`.

```bash
npm run build:glb && node tools/glb/validate.mjs
```
