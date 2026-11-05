/** Caminhos dos assets — troque os arquivos sem reprogramar as cenas (mesma convenção de escala). */
export const assets = {
  models: {
    asad: '/models/asad.glb',
    supremacy: '/models/supremacy-collectors-edition.glb',
  },
  brand: {
    logo3d: '/brand/lr-imports-logo.glb',
    logoPng: '/brand/logo.png',
  },
  audio: {
    mix: '/audio/mix.wav',
    narration: '/audio/narration.wav',
    music: '/audio/music.wav',
    sfx: '/audio/sfx.wav',
  },
  fonts: {
    light: '/fonts/inter-tight-latin-300-normal.woff',
    medium: '/fonts/inter-tight-latin-500-normal.woff',
    bold: '/fonts/inter-tight-latin-700-normal.woff',
    black: '/fonts/inter-tight-latin-800-normal.woff',
  },
} as const;
