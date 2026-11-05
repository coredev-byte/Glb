// Vetoriza a máscara da logo (potrace) -> tools/glb/work/logo.svg
import potrace from 'potrace';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(dir, 'work/logo-mask.png');
const output = path.join(dir, 'work/logo.svg');

potrace.trace(input, { threshold: 128, turdSize: 8, optTolerance: 0.25, alphaMax: 1.0, color: '#000' }, (err, svg) => {
  if (err) throw err;
  fs.writeFileSync(output, svg);
  console.log('logo.svg', svg.length, 'bytes');
});
