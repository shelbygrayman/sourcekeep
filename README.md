# Sourcekeep

**Find the thought. Keep the source.**

Private, browser-based search over your text and Markdown documents. Find exact passages and export a verifiable evidence bundle. Keyword search works immediately; optional on-device embeddings add meaning-based retrieval.

## Run

Node 24 or newer. No package installation or API key required. The first build downloads a pinned browser runtime from jsDelivr and verifies its SHA-256 checksum.

```sh
npm test
npm run build
npm run dev
# Open http://127.0.0.1:4173
```

The static `dist/` directory can be hosted under a subpath on any HTTPS static host. ES modules and model workers require HTTP(S), so opening `index.html` directly as a file is not supported. `npm run preview` serves the built directory.

## Use

1. Add `.txt` or `.md` documents, or try the 12 fictional sample documents.
2. Search with keywords. Optionally enable local AI, which downloads the model and runtime files.
3. Read the exact excerpts. AI matches are ranked suggestions, not confidence estimates.
4. Select passages and export evidence JSON. The export contains the query, source names, hashes, offsets and exact excerpts; review it before sharing.
5. Use **Run benchmark** to compare keyword and AI-assisted retrieval on this device. Your library is not changed by the benchmark.

Documents live in tab memory only. Closing or refreshing clears them. Identical text is deduplicated regardless of filename. Limits: 30 files, 1 MB per file, 3 million characters total, 5,000 passages, and 500 query characters. Large collections can exceed the three-minute AI operation limit.

## Implementation

- Original BM25-style lexical ranking and reciprocal-rank fusion.
- Transformers.js **4.3.1**, browser distribution fetched at build time with a pinned SHA-256 manifest and Apache-2.0 license.
- Mixedbread `mxbai-embed-xsmall-v1`, q8, pinned revision `e6ac24e5d6efb8782b59de1647b3ececb4ece94e`.
- Mean-pooled, normalized embeddings in a dedicated Web Worker.
- WebGPU when model loading succeeds; WebAssembly fallback when GPU loading fails.
- Exact source slices, UTF-16 character offsets and SHA-256 over the imported UTF-8 text.
- No generated answers: this app retrieves evidence; it does not establish whether the source is true.

The CPU fallback is implemented but has not yet been verified across browsers. A GPU failure during inference returns keyword results rather than silently claiming AI success. Model failures and timeouts remain visible.

## Measured results, 23 October 2026

Chrome 155 on the test Mac, WebGPU. **12 public synthetic questions over 12 short documents.** This is a development smoke benchmark, not an independent dataset, universal accuracy claim, or comparison with other products.

| Mode | Correct top result | Median query time | p95 query time |
| --- | ---: | ---: | ---: |
| Keyword | 11/12 | 0.30 ms | 0.50 ms |
| AI + keyword | 12/12 | 52.00 ms | 127.20 ms |

Query timings exclude model download and document indexing and include worker communication. The model and sample document vectors were already warm for this run. The initial 12-document semantic search took 2,125.7 ms including indexing. Hardware, corpus, browser and cache state affect timings. The sample question about remembering what you learn had no keyword overlap and was retrieved correctly by AI.

The full machine-readable run is in `chrome-webgpu-benchmark.json`. Run `npm run benchmark` for the keyword-only Node baseline. Use the UI to measure real browser inference. No external benchmark superiority is claimed.

## Evidence verification

`core.js` exports `verifyEvidence(report, documents)`. It recomputes hashes from original documents and checks each excerpt and its offsets. It detects modification and mismatches, not authorship, truth, or relevance. Original document text is not embedded in the report except selected excerpts.

## Privacy and limitations

Document text and queries stay in the tab. No telemetry or document-upload endpoint exists. Optional AI initialization contacts Hugging Face/model delivery hosts and jsDelivr for model/runtime assets; those services see ordinary connection information. Models may be cached. The app shell is not an offline PWA, and offline startup is not promised.

The browser-only distribution avoids unnecessary native/server dependencies. The minified library is generated locally by the first build and excluded from Git; build checks its pinned checksum. These checks protect against accidental changes but are not a third-party security audit. The runtime still downloads its pinned WASM assets. A compromised host, device or extension is outside the app's protections.

English-first, text and Markdown only. No PDF/OCR, sync, account, automatic truth checking, or generated answers. Semantic retrieval returns nearest passages even for unrelated questions: inspect the evidence. The 700-character chunks are a simple initial heuristic, with no overlap. This is an early implementation, not production security certification.

## Prior art and sources

Local document search is established work. This project is an independent small implementation centered on evidence exports and reproducible in-app measurements.

- [Transformers.js v4](https://huggingface.co/blog/transformersjs-v4) and [WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [Mixedbread model card](https://huggingface.co/mixedbread-ai/mxbai-embed-xsmall-v1)
- [local-first-rag](https://github.com/NagaYu/local-first-rag), an existing local search integration library
- [Local Knowledge Search](https://github.com/Poolchaos/local-knowledge-search), an existing browser document-search app

No affiliation or endorsement is implied. No source code was copied from these peer projects. Vendored Transformers.js is separately licensed.

## Contributing

Useful next work: independent evaluation queries, PDF extraction, mobile and CPU compatibility measurements, incremental indexing, and evidence verification UI. Include reproducible examples, expected behavior and measured limitations. Do not submit private documents.

MIT © 2026 Shelby. Third-party code retains its own notices in `TRANSFORMERS-LICENSE`.
