import { pipeline, env } from './transformers.min.js';
import { cosine, fuseRanks, lexicalSearch } from './core.js';
export const MODEL = 'mixedbread-ai/mxbai-embed-xsmall-v1';
const revision = 'e6ac24e5d6efb8782b59de1647b3ececb4ece94e';
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let extractor, backend, cachedKey, vectors;
let queue = Promise.resolve();
async function load() {
  if (extractor) return;
  const options = { revision, dtype: 'q8', progress_callback: p => {
    if (p.status === 'progress') self.postMessage({ progress: `Downloading model: ${p.file} ${Math.round(p.progress || 0)}%` });
  } };
  if (self.navigator.gpu) {
    try { extractor = await pipeline('feature-extraction', MODEL, { ...options, device: 'webgpu' }); backend = 'webgpu'; }
    catch { self.postMessage({ progress: 'GPU unavailable. Trying the CPU fallback…' }); }
  }
  if (!extractor) { extractor = await pipeline('feature-extraction', MODEL, { ...options, device: 'wasm' }); backend = 'wasm'; }
}
async function embed(text) {
  const tensor = await extractor(text, { pooling: 'mean', normalize: true });
  return tensor.tolist()[0];
}
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      await load();
      if (data.type === 'load') { self.postMessage({ id: data.id, result: { backend, model: MODEL, revision } }); return; }
      const key = data.chunks.map(c => c.id).join('|');
      if (key !== cachedKey) {
        const next = [];
        for (let i = 0; i < data.chunks.length; i++) {
          self.postMessage({ progress: `Reading passage ${i + 1} of ${data.chunks.length} on this device…` });
          next.push(await embed(data.chunks[i].text));
        }
        vectors = next; cachedKey = key;
      }
      const queryVector = await embed(data.query);
      const semantic = data.chunks.map((c, i) => ({ ...c, score: cosine(vectors[i], queryVector) })).sort((a, b) => b.score - a.score);
      const results = fuseRanks(lexicalSearch(data.chunks, data.query), semantic);
      self.postMessage({ id: data.id, result: { results, backend, model: MODEL, revision } });
    } catch (error) { self.postMessage({ id: data.id, error: error.message || 'Local model could not run.' }); }
  });
};
