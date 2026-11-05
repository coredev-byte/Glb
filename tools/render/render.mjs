/**
 * Exportação determinística por frame.
 *   node tools/render/render.mjs --stills 1.5,10.5,28              → PNGs dos instantes (segundos)
 *   node tools/render/render.mjs --frames --from 0 --to 713        → JPEGs numerados em exports/frames (retomável;
 *   node tools/render/render.mjs --frames --from 713 --to 1425        rode 2 processos em paralelo)
 *   node tools/render/render.mjs --encode                          → MP4 1080×1920 30 fps H.264 + AAC 48 kHz (−14 LUFS)
 *   node tools/render/render.mjs --from 0 --to 1425                → tudo num processo só (pipe direto para o FFmpeg)
 * Cada frame: define o relógio global → renderiza (R3F advance) → captura a moldura (canvas + camada 2D).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '../glb/pw.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const timeline = JSON.parse(fs.readFileSync(path.join(root, 'src/config/timeline.json'), 'utf8'));
const FPS = timeline.fps;
const TOTAL = Math.round(timeline.duration * FPS);
const outDir = path.join(root, args.out || 'exports');
fs.mkdirSync(outDir, { recursive: true });

const QUALITY = args.query ?? 'msaa=0&dofres=0.4&smaa=1';
const framesDir = path.join(root, 'exports/frames');
const silentPath = path.join(outDir, 'lr-imports-supremacy-1080x1920-sem-audio.mp4');
const finalPath = path.join(outDir, 'lr-imports-supremacy-1080x1920.mp4');
const run = (cmd, a) => new Promise((res, rej) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', (c) => (c === 0 ? res() : rej(new Error(cmd + ' falhou')))); });
async function mux(silent) {
  await run('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', path.join(root, 'public/audio/mix.wav'),
    '-filter:a', 'loudnorm=I=-14:TP=-1.0:LRA=11,aresample=48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart', finalPath]);
  console.log('final:', finalPath);
}
if (args.encode) {
  const missing = [];
  for (let f = 0; f < TOTAL; f++) if (!fs.existsSync(path.join(framesDir, `f${String(f).padStart(5, '0')}.jpg`))) missing.push(f);
  if (missing.length) { console.error(`faltam ${missing.length} frames (ex.: ${missing.slice(0, 5).join(', ')})`); process.exit(1); }
  await run('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silentPath]);
  await mux(silentPath);
  process.exit(0);
}

const server = await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 300)); });
await page.goto(`${url}?render&${QUALITY}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready && window.__renderFrame, null, { timeout: 180000 });
// aquecimento: compila shaders e gera o ambiente
for (const f of [0, 300, 800, 1300, 0]) await page.evaluate((n) => window.__renderFrame(n), f);

async function grab(frame, type = 'png') {
  const a = Date.now();
  await page.evaluate((n) => window.__renderFrame(n), frame);
  const b = Date.now();
  const png = await page.screenshot({ type, ...(type === 'jpeg' ? { quality: 95 } : {}), clip: { x: 0, y: 0, width: 1080, height: 1920 }, timeout: 120000 });
  if (args.verbose) console.log(`  render ${b - a} ms, capture ${Date.now() - b} ms`);
  return png;
}

if (args.stills) {
  const times = String(args.stills).split(',').map(Number);
  for (const t of times) {
    const f = Math.round(t * FPS);
    const t0 = Date.now();
    const png = await grab(f);
    const file = path.join(outDir, `still-${String(t.toFixed(2)).padStart(5, '0')}s.png`);
    fs.writeFileSync(file, png);
    console.log(file, `${Date.now() - t0} ms`);
  }
} else if (args.frames) {
  fs.mkdirSync(framesDir, { recursive: true });
  const from = Number(args.from ?? 0), to = Math.min(TOTAL, Number(args.to ?? TOTAL));
  const t0 = Date.now();
  let done = 0;
  for (let f = from; f < to; f++) {
    const file = path.join(framesDir, `f${String(f).padStart(5, '0')}.jpg`);
    if (fs.existsSync(file)) continue;
    const jpg = await grab(f, 'jpeg');
    fs.writeFileSync(file + '.tmp', jpg);
    fs.renameSync(file + '.tmp', file);
    done++;
    if (done % 15 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${f}/${to}  ${(el / done).toFixed(2)} s/frame  ETA ${((to - f) * el / done / 60).toFixed(1)} min`);
    }
  }
  console.log(`ok: frames ${from}-${to}`);
} else {
  const from = Number(args.from ?? 0), to = Math.min(TOTAL, Number(args.to ?? TOTAL));
  const silent = path.join(outDir, `video-${from}-${to}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const png = await grab(f);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) {
      const el = (Date.now() - t0) / 1000, done = f - from + 1;
      console.log(`frame ${f}/${to}  ${(el / done).toFixed(2)} s/frame  ETA ${((to - f) * el / done / 60).toFixed(1)} min`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('vídeo (sem áudio):', silent);
  if (from === 0 && to === TOTAL) await mux(silent);
}
await browser.close();
await server.close();
