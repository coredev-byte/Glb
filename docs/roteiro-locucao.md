# Roteiro de locução e timeline — LR Imports · Supremacy Collector's Edition

**Formato:** 9:16 · 1080×1920 · 30 fps · 47,5 s (1.425 frames)
**Voz:** Marcio — Viral Hook Narrator (ElevenLabs, modelo eleven_v4), uma tomada contínua com tags de interpretação.
**Arquivo bruto:** `public/audio/narration/marcio-take1.mp3` (45,6 s) → editado em `public/audio/narration.wav`.
**Edição:** cenas 1–5 deslocadas +0,25 s; cenas 6–10 deslocadas +0,85 s (0,6 s de silêncio extra antes da virada).
Fonte única de verdade dos tempos: `src/config/timeline.json`.

| Cena | Janela | Locução (início–fim) | Texto | Interpretação / ênfase | Texto em tela |
|---|---|---|---|---|---|
| 01 O cheiro da oferta | 0,00–3,20 | 0,25–2,75 | Tem promoção que chega fazendo barulho… | [intrigued] [softly], reticência no fim | TEM CHEIRO / DE OFERTA. · cards OFERTA, PREÇO BAIXO, IMPERDÍVEL |
| 02 O preço por trás da oferta | 3,20–7,20 | 3,37–5,56 · 5,89–6,89 | Mas quando você olha o preço de perto… a história muda. | [suspicious], pausa antes de "a história muda" | MAS SERÁ / QUE É? · etiqueta com preços reais rolando |
| 03 Mesmo produto, valores diferentes | 7,20–13,30 | 7,43–10,71 · 11,07–13,07 | O mesmo Asad foi anunciado por cento e noventa e nove reais… e por trezentos e noventa e nove. | [serious] → [surprised] no segundo valor | O MESMO PERFUME. / PREÇOS MUITO DIFERENTES. · 7 colunas |
| 04 O índice | 13,30–17,80 | 13,44–15,94 · 16,35–17,50 | São mais de duzentos reais de diferença. Pelo MESMO frasco. | [dramatically], ênfase em MESMO | R$ 200,49 · DE DIFERENÇA. · +100,5% · "Do menor ao maior preço da amostra." |
| 05 A frase de ruptura | 17,80–22,50 | 17,97–21,67 | Barato? Nem sempre. Justo? É outra conversa. | [sarcastic] → [confident]; **silêncio 21,7–22,5** (música corta) | PREÇO BAIXO ≠ PREÇO JUSTO |
| 06 A virada | 22,50–27,20 | 23,03–24,64 · 24,96–25,79 · 26,17–26,87 | Porque o que deve deixar rastro… é a fragrância. Não o preço. | [softly] [warmly], pausa após "rastro" | O QUE DEVE / DEIXAR RASTRO… → É A FRAGRÂNCIA. |
| 07 A aparição do Supremacy | 27,20–33,00 | 27,46–32,73 | Na LR Imports, a proposta é outra: perfumes árabes selecionados e preço justo. | [confident] | UMA OUTRA FORMA / DE ESCOLHER. → logo LR Importados |
| 08 A fragrância em 3D | 33,00–38,50 | 33,07–35,53 · 35,81–38,30 | Supremacy Collector's Edition, da Afnan. Frutado, elegante e marcante. | [admiring] → [warmly] | SUPREMACY / COLLECTOR’S EDITION · ABERTURA → CORAÇÃO → BASE |
| 09 O preço justo | 38,50–42,95 | 38,65–42,74 | Uma fragrância feita para marcar presença. E uma escolha que faz sentido. | [confident] | SOFISTICAÇÃO / SEM EXAGERO. → PREÇO JUSTO. / ESCOLHA INTELIGENTE. |
| 10 Encerramento | 42,95–47,50 | 43,11–44,17 · 44,44–45,32 · 45,62–46,45 | LR Imports. Deixe sua marca. Peça o seu. | [warmly] → [excited] no CTA | DEIXE O RASTRO / PARA A FRAGRÂNCIA. / NÃO PARA O PREÇO. · logo · PERFUMES ÁRABES SELECIONADOS. · FALE COM A LR IMPORTS · @lr.imports.mt |

## Prompt enviado ao ElevenLabs (texto com tags)

```
[intrigued] [softly] Tem promoção que chega fazendo barulho…
[pause] [suspicious] Mas quando você olha o preço de perto… a história muda.
[pause] [serious] O mesmo Asad foi anunciado por cento e noventa e nove reais… [surprised] e por trezentos e noventa e nove.
[pause] [dramatically] São mais de duzentos reais de diferença. [short pause] Pelo MESMO frasco.
[pause] [sarcastic] Barato? Nem sempre. [confident] Justo? É outra conversa.
[long pause] [softly] [warmly] Porque o que deve deixar rastro… é a fragrância. Não o preço.
[pause] [confident] Na LR Imports, a proposta é outra: perfumes árabes selecionados e preço justo.
[pause] [admiring] Supremacy Collector's Edition, da Afnan. [warmly] Frutado, elegante e marcante.
[pause] [confident] Uma fragrância feita para marcar presença. E uma escolha que faz sentido.
[pause] [warmly] LR Imports. [short pause] Deixe sua marca. [excited] Peça o seu.
```

## Sound design (cues em `timeline.json → sfx`)

- 0,00 sub-impact + textura metálica + whoosh (light sweep) · 1,15/1,45/1,75 ticks de vidro (cards)
- 3,05 whoosh atravessando o card · 3,9–6,5 dígitos mecânicos · 6,55 clique final
- 8,0–10,4 sete impactos tonais (um por coluna; extremos acentuados) · 12,2 sub-impact no maior preço
- 13,6–14,75 contador + impacto quando o R$ 200,49 assenta · 16,2 riser + ping no +100,5%
- 17,75 estilhaço metálico · 21,2 riser · **21,7–22,5 silêncio** · 22,5 boom (virada)
- 24,55 gota + ondas · 25,6 riser · 27,2 revelação (sub + sinos) · 34,85/36,15/37,25 sinos das notas
- 43,1 assinatura sonora (ré–lá–fá) · 46,5 sting final (sem fade longo)

Trilha: ambient eletrônico original em Ré menor, 84 BPM, sintetizado (`tools/audio/build_audio.py`), com ducking sob a voz.
Stems: `public/audio/narration.wav`, `music.wav`, `sfx.wav`, `mix.wav` (48 kHz, 24-bit).
