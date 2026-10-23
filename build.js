import { mkdir, cp, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile(new URL('./vendor-manifest.json', import.meta.url), 'utf8'));
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(await readFile(new URL(`./${file}`, import.meta.url))).digest('hex');
  if (actual !== expected) throw new Error(`Vendor checksum mismatch: ${file}`);
}
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'app.js', 'core.js', 'fixtures.js', 'model-worker.js', 'style.css', 'transformers.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'TRANSFORMERS-LICENSE']) await cp(path, `dist/${path}`, { recursive: true });
console.log('Static build ready in dist/. Vendor checksums verified. No package installation required.');
