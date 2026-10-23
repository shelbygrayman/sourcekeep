import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocument, makeDocument, sha256, lexicalSearch, cosine, fuseRanks, evidenceReport, verifyEvidence, summarizeBenchmark, terms } from './core.js';
test('Unicode tokenization and normalization', () => assert.deepEqual(terms('CAFÉ 日本語 ＴＥＳＴ'), ['café', '日本語', 'test']));
test('chunk offsets preserve exact input including emoji', () => {
  const text = '💡'.repeat(300) + '\n\n' + 'source passage '.repeat(100);
  const chunks = chunkDocument({ id: '1', name: 'test', text }, 51);
  assert.equal(chunks.map(c => c.text).join(''), text);
  for (const c of chunks) { assert.equal(text.slice(c.start, c.end), c.text); assert.ok(c.text.isWellFormed()); }
});
test('empty, binary and oversized imports rejected', async () => {
  for (const text of ['', ' \n', 'a\0b', 'a'.repeat(1_000_001)]) await assert.rejects(makeDocument('x', text));
});
test('identical text hashes identically regardless of file name', async () => {
  assert.equal((await makeDocument('one', 'hello')).id, (await makeDocument('two', 'hello')).id);
  assert.equal(await sha256('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});
test('lexical retrieval ranks direct matches and abstains without overlap', () => {
  const chunks = [{ id: 'a', text: 'orchard apples harvest' }, { id: 'b', text: 'invoice payment receipt' }];
  assert.equal(lexicalSearch(chunks, 'payment invoice')[0].id, 'b');
  assert.deepEqual(lexicalSearch(chunks, 'neutrino'), []);
  assert.deepEqual(lexicalSearch(chunks, 'the and'), []);
});
test('empty corpus is safe', () => assert.deepEqual(lexicalSearch([], 'apple'), []));
test('cosine validates dimensions and values', () => {
  assert.equal(cosine([1, 0], [1, 0]), 1); assert.equal(cosine([0, 0], [1, 0]), 0);
  assert.throws(() => cosine([1], [1, 2])); assert.throws(() => cosine([NaN], [1]));
});
test('fusion rewards consensus and does not mutate input', () => {
  const a = [{ id: '1', score: 4 }, { id: '2', score: 3 }]; const b = [{ id: '2', score: .9 }];
  assert.equal(fuseRanks(a, b)[0].id, '2'); assert.equal(a[0].score, 4);
});
test('evidence verifies against originals and rejects altered passages and sources', async () => {
  const doc = await makeDocument('source.md', 'hello evidence'); const chunks = chunkDocument(doc);
  const report = await evidenceReport('evidence', chunks, [doc], 'keyword');
  assert.equal((await verifyEvidence(report, [doc]))[0].valid, true);
  assert.equal((await verifyEvidence(report, [{ ...doc, text: 'changed' }]))[0].valid, false);
  report.excerpts[0].excerpt = 'altered'; assert.equal((await verifyEvidence(report, [doc]))[0].valid, false);
});
test('export refuses stale or substituted excerpts', async () => {
  const doc = await makeDocument('source', 'original');
  await assert.rejects(evidenceReport('', [{ ...chunkDocument(doc)[0], text: 'different' }], [doc], 'keyword'));
});
test('verification rejects invalid bounds and missing original', async () => {
  const doc = await makeDocument('source', 'original'); const report = await evidenceReport('', chunkDocument(doc), [doc], 'keyword');
  assert.equal((await verifyEvidence(report, []))[0].valid, false);
  report.excerpts[0].start = -1; assert.equal((await verifyEvidence(report, [doc]))[0].valid, false);
});
test('benchmark metrics handle misses and percentile boundaries', () => {
  const s = summarizeBenchmark([{ rank: 1, ms: 1 }, { rank: 3, ms: 3 }, { rank: 0, ms: 2 }]);
  assert.equal(s.hitAt1, 1/3); assert.equal(s.hitAt3, 2/3); assert.equal(s.p50Ms, 2); assert.equal(s.p95Ms, 3);
  assert.throws(() => summarizeBenchmark([]));
});
