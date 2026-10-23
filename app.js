import { LIMITS, makeDocument, chunkDocument, lexicalSearch, evidenceReport, summarizeBenchmark } from './core.js';
import { samples, questions } from './fixtures.js';
const $ = id => document.getElementById(id);
let documents = [], chunks = [], results = [], selected = new Set(), resultQuery = '', resultMode = 'keyword';
let busy = false, ai = false, worker, serial = 0, modelInfo;
const pending = new Map();
function say(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function controls(value) {
  busy = value;
  for (const id of ['files', 'search-button', 'enable-ai', 'benchmark', 'search']) $(id).disabled = value;
  $('clear').disabled = value || !documents.length;
  $('export').disabled = value || !selected.size;
  const sampleButton = $('samples'); if (sampleButton) sampleButton.disabled = value;
  document.querySelectorAll('.doc button, .result input').forEach(el => el.disabled = value);
}
function node(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
function resetResults() { results = []; selected.clear(); $('export').disabled = true; $('results').replaceChildren(node('p', 'Your library is ready. Search for a detail, idea, or phrase.', 'muted')); $('results-title').textContent = 'Your sources'; }
function refreshLibrary() {
  chunks = documents.flatMap(d => chunkDocument(d));
  $('count').textContent = documents.length;
  $('library').replaceChildren();
  for (const doc of documents) {
    const row = node('div', undefined, 'doc');
    const name = node('span', doc.name, 'doc-name'); name.title = doc.name;
    const remove = node('button', '×'); remove.setAttribute('aria-label', `Remove ${doc.name}`);
    remove.onclick = () => { if (busy) return; documents = documents.filter(d => d.id !== doc.id); refreshLibrary(); resetResults(); say('Document removed from this tab.'); };
    row.append(node('span', '▤'), name, remove); $('library').append(row);
  }
  $('clear').disabled = busy || !documents.length;
}
async function addFiles(files) {
  controls(true);
  try {
    const next = [...documents]; const errors = []; let duplicates = 0;
    for (const file of files) {
      try {
        if (!/\.(txt|md)$/i.test(file.name)) throw new Error('Use a .txt or .md file.');
        if (file.size > LIMITS.bytes) throw new Error('The file is larger than 1 MB.');
        const doc = await makeDocument(file.name, await file.text());
        if (next.some(d => d.id === doc.id)) { duplicates++; continue; }
        if (next.length >= LIMITS.files) throw new Error('The library holds up to 30 files.');
        if (next.reduce((n, d) => n + d.text.length, 0) + doc.text.length > LIMITS.totalChars) throw new Error('The library is limited to 3 million characters.');
        if ([...next, doc].flatMap(d => chunkDocument(d)).length > LIMITS.chunks) throw new Error('The library has too many passages.');
        next.push(doc);
      } catch (e) { errors.push(`${file.name}: ${e.message}`); }
    }
    documents = next; refreshLibrary(); resetResults();
    say(`${documents.length} documents ready. ${duplicates ? `${duplicates} duplicate(s) skipped. ` : ''}${errors.join(' ')}`, errors.length > 0);
  } finally { $('files').value = ''; controls(false); }
}
$('files').onchange = () => addFiles([...$('files').files]);
$('samples').onclick = async () => {
  controls(true);
  try { documents = await Promise.all(samples.map(d => makeDocument(d.name, d.text))); refreshLibrary(); resetResults(); say('12 fictional sample documents loaded. Try “How can I remember what I learn?”'); $('search').value = 'How can I remember what I learn?'; }
  finally { controls(false); }
};
$('clear').onclick = () => { documents = []; refreshLibrary(); resetResults(); say('Library cleared. Refresh to restore the sample introduction.'); };
$('privacy').onclick = () => $('privacy-dialog').showModal();
$('enable-ai').onclick = () => {
  if (ai) { ai = false; $('mode-label').textContent = 'Keyword search · ready'; $('enable-ai').textContent = '✧ Enable local AI'; say('Keyword search selected.'); }
  else $('ai-dialog').showModal();
};
$('ai-cancel').onclick = () => $('ai-dialog').close();
function modelRequest(type, payload = {}) {
  if (!worker) {
    worker = new Worker(new URL('./model-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.progress) { say(data.progress); return; }
      const task = pending.get(data.id); if (!task) return;
      clearTimeout(task.timer); pending.delete(data.id);
      data.error ? task.reject(new Error(data.error)) : task.resolve(data.result);
    };
    worker.onerror = () => stopWorker('The model worker failed. Keyword search is still available.');
  }
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => stopWorker('Local AI exceeded the 3-minute limit. Try fewer documents or keyword search.'), 180_000);
    pending.set(id, { resolve, reject, timer }); worker.postMessage({ type, id, ...payload });
  });
}
function stopWorker(message) {
  worker?.terminate(); worker = null; ai = false;
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(message)); } pending.clear();
  $('mode-label').textContent = 'Keyword search · ready'; $('enable-ai').textContent = '✧ Enable local AI';
}
$('ai-confirm').onclick = async () => {
  $('ai-dialog').close(); controls(true); say('Loading the local model. The first download may take a minute…');
  try { modelInfo = await modelRequest('load'); ai = true; $('mode-label').textContent = `AI + keyword · ${modelInfo.backend === 'webgpu' ? 'GPU' : 'CPU'}`; $('enable-ai').textContent = 'Use keyword search'; say('Local AI is ready. The first search will index your documents.'); }
  catch (e) { stopWorker(e.message); say(`AI unavailable: ${e.message}`, true); }
  finally { controls(false); }
};
function renderResults() {
  $('results').replaceChildren(); selected.clear();
  $('results-title').textContent = `${results.length} source passages`;
  if (!results.length) $('results').append(node('p', 'No matching passages. Try different words or enable local AI.', 'muted'));
  results.forEach((r, i) => {
    const card = node('article', undefined, 'result');
    const top = node('div', undefined, 'result-top'); top.append(node('span', `${String(i + 1).padStart(2, '0')} / ${r.name}`, 'source-name'), node('span', 'EXACT EXCERPT'));
    const bottom = node('div', undefined, 'result-bottom'); const label = node('label'); const input = node('input'); input.type = 'checkbox'; input.checked = true; selected.add(r.id);
    input.onchange = () => { input.checked ? selected.add(r.id) : selected.delete(r.id); $('export').disabled = busy || !selected.size; };
    label.append(input, node('span', 'Include in export'));
    bottom.append(label, node('span', `Characters ${r.start + 1}–${r.end}`));
    card.append(top, node('blockquote', r.text), bottom); $('results').append(card);
  });
}
$('search-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  const query = $('search').value.trim();
  if (!query) { say('Enter a question or a few keywords.', true); return; }
  if (!chunks.length) { say('Add documents or load the sample workspace first.', true); return; }
  controls(true); const started = performance.now();
  try {
    resultQuery = query; resultMode = ai ? 'hybrid' : 'keyword';
    results = ai ? (await modelRequest('search', { query, chunks })).results : lexicalSearch(chunks, query);
    results = results.slice(0, 6); renderResults();
    say(`${results.length} passages · ${(performance.now() - started).toFixed(1)} ms${ai ? ' including any indexing · AI matches may be unrelated; check the excerpts.' : ' · Exact words ranked by relevance.'}`);
  } catch (e) { stopWorker(e.message); results = lexicalSearch(chunks, query).slice(0, 6); resultMode = 'keyword-fallback'; renderResults(); say(`AI search failed; showing keyword results. ${e.message}`, true); }
  finally { controls(false); }
};
function download(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = node('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').onclick = async () => {
  controls(true);
  try { download('sourcekeep-evidence.json', await evidenceReport(resultQuery, results.filter(r => selected.has(r.id)), documents, resultMode)); say('Evidence exported. It contains the query and selected passages; review before sharing.'); }
  catch (e) { say(e.message, true); } finally { controls(false); }
};
$('benchmark').onclick = async () => {
  controls(true); $('benchmark-result').replaceChildren();
  try {
    const docs = await Promise.all(samples.map(d => makeDocument(d.name, d.text)));
    const sampleChunks = docs.flatMap(d => chunkDocument(d)); const modes = ai ? ['keyword', 'hybrid'] : ['keyword']; const runs = [];
    for (const mode of modes) {
      let setupMs = 0;
      if (mode === 'hybrid') { const start = performance.now(); await modelRequest('search', { chunks: sampleChunks, query: 'warm up' }); setupMs = performance.now() - start; }
      const rows = [];
      for (const q of questions) {
        const start = performance.now();
        const ranked = mode === 'hybrid' ? (await modelRequest('search', { chunks: sampleChunks, query: q.query })).results : lexicalSearch(sampleChunks, q.query);
        rows.push({ ...q, ms: performance.now() - start, rank: ranked.findIndex(r => r.name === q.expected) + 1 });
      }
      runs.push({ mode, setupMs, summary: summarizeBenchmark(rows), rows });
    }
    const report = { schema: 'sourcekeep.benchmark.v1', createdAt: new Date().toISOString(), fixture: 'synthetic-v1', userAgent: navigator.userAgent, model: ai ? modelInfo : null, note: '12 public synthetic queries; development smoke benchmark, not independent or representative. Timings vary by device. Hybrid query timing excludes indexing and includes worker messages.', runs };
    const table = node('table'); const head = node('tr'); ['Mode', 'Hit@1', 'Hit@3', 'p50', 'p95'].forEach(t => head.append(node('th', t))); table.append(head);
    runs.forEach(run => { const s = run.summary; const row = node('tr'); [run.mode, `${(s.hitAt1 * 100).toFixed(0)}%`, `${(s.hitAt3 * 100).toFixed(0)}%`, `${s.p50Ms.toFixed(2)} ms`, `${s.p95Ms.toFixed(2)} ms`].forEach(t => row.append(node('td', t))); table.append(row); });
    const exportButton = node('button', 'Download benchmark JSON ↓', 'textbutton'); exportButton.onclick = () => download('sourcekeep-benchmark.json', report);
    $('benchmark-result').append(table, node('p', report.note, 'muted'), exportButton); say('Benchmark complete. Your library was not changed.');
  } catch (e) { say(`Benchmark failed: ${e.message}`, true); }
  finally { controls(false); }
};
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { event.preventDefault(); $('search').focus(); } });
