export const LIMITS = Object.freeze({ files: 30, bytes: 1_000_000, totalChars: 3_000_000, chunks: 5000, query: 500 });
const stop = new Set('a an the is are was were to of for in on at and or with my i it this that how what when where do does can'.split(' '));
export function terms(text) {
  return (text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(t => !stop.has(t));
}
export function chunkDocument(doc, size = 700) {
  if (!Number.isInteger(size) || size < 50) throw new Error('Chunk size must be at least 50.');
  const chunks = [];
  for (let start = 0; start < doc.text.length;) {
    let end = Math.min(start + size, doc.text.length);
    if (end < doc.text.length) {
      const boundary = doc.text.lastIndexOf(' ', end);
      if (boundary > start + size / 2) end = boundary;
      // Never split a surrogate pair, even for text without spaces.
      const c = doc.text.charCodeAt(end - 1);
      if (c >= 0xd800 && c <= 0xdbff) end--;
    }
    const text = doc.text.slice(start, end);
    if (text.trim()) chunks.push({ id: `${doc.id}:${start}`, docId: doc.id, name: doc.name, start, end, text });
    start = end;
  }
  return chunks;
}
export async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function makeDocument(name, text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('The file contains no readable text.');
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error('Each file must be 1 MB or smaller.');
  if (text.includes('\0')) throw new Error('This looks like a binary file. Use plain text or Markdown.');
  const hash = await sha256(text);
  return { id: hash, hash, name: String(name).slice(0, 200), text };
}
export function lexicalSearch(chunks, query) {
  const queryTerms = [...new Set(terms(query))];
  if (!queryTerms.length || !chunks.length) return [];
  const tokens = chunks.map(c => terms(c.text));
  const average = tokens.reduce((s, t) => s + t.length, 0) / tokens.length || 1;
  const dfs = new Map(queryTerms.map(t => [t, tokens.filter(ts => ts.includes(t)).length]));
  return chunks.map((chunk, i) => {
    const ts = tokens[i];
    const score = queryTerms.reduce((sum, term) => {
      const count = ts.filter(t => t === term).length;
      const idf = Math.log(1 + (chunks.length - dfs.get(term) + 0.5) / (dfs.get(term) + 0.5));
      return sum + idf * (count * 2.2) / (count + 1.2 * (0.25 + 0.75 * ts.length / average));
    }, 0);
    return { ...chunk, score };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export function cosine(a, b) {
  if (!a.length || a.length !== b.length) throw new Error('Embedding dimensions differ.');
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) throw new Error('Invalid embedding.');
    dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export function fuseRanks(lexical, semantic, k = 60) {
  const combined = new Map();
  for (const list of [lexical, semantic]) list.slice(0, 50).forEach((row, i) => {
    const old = combined.get(row.id) || { ...row, score: 0 };
    old.score += 1 / (k + i + 1); combined.set(row.id, old);
  });
  return [...combined.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export async function evidenceReport(query, results, documents, mode) {
  const sources = new Map(documents.map(d => [d.id, d]));
  const excerpts = await Promise.all(results.map(async r => {
    const doc = sources.get(r.docId);
    if (!doc || doc.text.slice(r.start, r.end) !== r.text) throw new Error('Source excerpt no longer matches.');
    return { source: doc.name, sourceHash: doc.hash, start: r.start, end: r.end, excerpt: r.text, excerptHash: await sha256(r.text) };
  }));
  return { schema: 'sourcekeep.evidence.v1', createdAt: new Date().toISOString(), query, mode,
    offsets: 'UTF-16 code units; end exclusive; hashes use UTF-8 text after import',
    notice: 'Hashes detect changes; they do not prove authorship, truth, or retrieval relevance. Original documents are not included.', excerpts };
}
export async function verifyEvidence(report, documents) {
  if (report?.schema !== 'sourcekeep.evidence.v1' || !Array.isArray(report.excerpts)) throw new Error('Unsupported report.');
  const byHash = new Map(await Promise.all(documents.map(async d => [await sha256(d.text), d])));
  return Promise.all(report.excerpts.map(async r => {
    const source = byHash.get(r.sourceHash);
    const validBounds = Number.isInteger(r.start) && Number.isInteger(r.end) && r.start >= 0 && r.end > r.start;
    return { source: r.source, valid: Boolean(source && validBounds && r.end <= source.text.length && source.text.slice(r.start, r.end) === r.excerpt && await sha256(r.excerpt) === r.excerptHash) };
  }));
}
export function summarizeBenchmark(rows) {
  if (!rows.length) throw new Error('No benchmark queries.');
  const sorted = rows.map(r => r.ms).sort((a, b) => a - b);
  return { queries: rows.length, hitAt1: rows.filter(r => r.rank === 1).length / rows.length,
    hitAt3: rows.filter(r => r.rank > 0 && r.rank <= 3).length / rows.length,
    mrr: rows.reduce((sum, r) => sum + (r.rank ? 1 / r.rank : 0), 0) / rows.length,
    p50Ms: sorted[Math.ceil(sorted.length * .5) - 1], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1] };
}
