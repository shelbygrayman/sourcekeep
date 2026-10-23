import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile(new URL('./vendor-manifest.json', import.meta.url), 'utf8'));
for (const [file, expected] of Object.entries(manifest.files)) {
  let bytes;
  try { bytes = await readFile(new URL(`./${file}`, import.meta.url)); }
  catch (error) {
    if (file !== 'transformers.min.js' || error.code !== 'ENOENT') throw error;
    const url = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js';
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Runtime download failed: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('Downloaded runtime checksum mismatch.');
    await writeFile(new URL('./transformers.min.js', import.meta.url), bytes, { flag: 'wx' });
    console.log('Downloaded and verified pinned Transformers.js 4.3.1 browser runtime.');
  }
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Vendor checksum mismatch: ${file}`);
}
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'app.js', 'core.js', 'fixtures.js', 'model-worker.js', 'style.css', 'transformers.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'TRANSFORMERS-LICENSE']) await cp(path, `dist/${path}`, { recursive: true });
console.log('Static build ready in dist/. Vendor checksums verified. No package installation required.');
