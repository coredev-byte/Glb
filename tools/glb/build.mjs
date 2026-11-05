// Gera os GLBs procedurais no Chromium headless (three.js + GLTFExporter).
// uso: node tools/glb/build.mjs [supremacy-collectors-edition] [lr-imports-logo]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './pw.mjs';
import { serve } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const targets = {
  'supremacy-collectors-edition': 'public/models/supremacy-collectors-edition.glb',
  'lr-imports-logo': 'public/brand/lr-imports-logo.glb',
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(targets);

const { server, url } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${url}/tools/glb/builder.html`);
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
for (const name of names) {
  const t0 = Date.now();
  const b64 = await page.evaluate((n) => window.buildGLB(n), name);
  const out = path.join(root, targets[name]);
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(`${targets[name]}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB  (${Date.now() - t0} ms)`);
}
await browser.close();
server.close();
