import { performance } from 'node:perf_hooks';
import { makeDocument, chunkDocument, lexicalSearch, summarizeBenchmark } from './core.js';
import { samples, questions } from './fixtures.js';
const docs = await Promise.all(samples.map(d => makeDocument(d.name, d.text)));
const chunks = docs.flatMap(d => chunkDocument(d));
const rows = questions.map(q => {
  const start = performance.now(); const results = lexicalSearch(chunks, q.query);
  return { ...q, ms: performance.now() - start, rank: results.findIndex(r => r.name === q.expected) + 1 };
});
console.log(JSON.stringify({ schema: 'sourcekeep.benchmark.v1', createdAt: new Date().toISOString(), runtime: process.version, platform: `${process.platform}-${process.arch}`, fixture: 'synthetic-v1', note: '12 public synthetic queries. Keyword baseline only. Not an independent evaluation or an AI performance claim.', summary: summarizeBenchmark(rows), rows }, null, 2));
