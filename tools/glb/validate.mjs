// Valida os GLBs com o validador oficial Khronos e imprime um resumo.
import fs from 'node:fs';
import validator from 'gltf-validator';

const files = ['public/models/asad.glb', 'public/models/supremacy-collectors-edition.glb', 'public/brand/lr-imports-logo.glb'];
let failed = false;
for (const f of files) {
  const r = await validator.validateBytes(new Uint8Array(fs.readFileSync(f)));
  const { numErrors, numWarnings } = r.issues;
  const info = r.info || {};
  console.log(`${f}: ${numErrors} erros, ${numWarnings} avisos | ${info.totalVertexCount} vértices, ${info.materialCount} materiais, ${info.extensionsUsed?.join(', ') || '-'}`);
  for (const m of r.issues.messages.filter((m) => m.severity <= 1).slice(0, 5)) console.log('   ', m.code, m.message, m.pointer || '');
  if (numErrors) failed = true;
}
process.exit(failed ? 1 : 0);
