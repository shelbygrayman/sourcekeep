# Validation and benchmarks

## Reproduce

Use Node 24. No dependency installation is needed for these checks.

```sh
node --test core.test.js
```

On 25 October 2026, the suite passed **12 tests** on the maintainer's Mac. These are regression checks for the covered cases, not proof of zero bugs, a security audit, or a comparison with competing products. CI runs the same suite on Linux.

## Retrieval smoke benchmark

Run `node benchmark.js` for the keyword baseline, or use **Run benchmark** in the [public demo](https://shelbygrayman.github.io/sourcekeep/) after enabling local AI.

The fixture is 12 public, synthetic documents and 12 development queries. It is not held-out evaluation data. The checked-in `chrome-webgpu-benchmark.json` records the original 23 October run. A 25 October Chrome/WebGPU spot check again retrieved the expected first result for 11/12 keyword queries and 12/12 hybrid queries. Warm query median/p95 were 0.30/1.30 ms keyword and 55.60/93.90 ms hybrid; initial semantic search including indexing took 1751.6 ms. These device-specific spot-check timings are not cross-device performance claims.

Run your own measurements and retain raw JSON. Model download, indexing, and warm queries must be reported separately. CPU fallback, mobile browsers, unrelated queries, and larger independent corpora remain evaluation gaps.
