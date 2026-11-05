// Renderiza previews PNG de um GLB em vários ângulos.
// uso: node tools/glb/preview.mjs <modelo> [dir=models] [saida] [yaw,yaw...] [extraQuery]
import { chromium } from './pw.mjs';
import path from 'node:path';
import fs from 'node:fs';
import { serve } from './serve.mjs';

const [model = 'supremacy-collectors-edition', dir = 'models', out = 'exports/previews', yaws = '0,35,90,180', extra = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const { server, url } = await serve();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
for (const yaw of yaws.split(',')) {
  await page.goto(`${url}/tools/glb/viewer.html?model=${model}&dir=${dir}&shot&yaw=${yaw}${extra ? '&' + extra : ''}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  const file = path.join(out, `${model}-yaw${yaw}${extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '_') : ''}.png`);
  await page.locator('canvas').screenshot({ path: file });
  console.log(file, JSON.stringify(await page.evaluate(() => window.__info)));
}
await browser.close();
server.close();
