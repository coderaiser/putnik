# Benchmark: Putnik vs Putout

```sh
BENCH_SRC=node_modules BENCH_SIZES=25,100,250 BENCH_PERFILE_MAX=250 BENCH_RUNS=3 node bench/bench.js
```

Compares the same two rules (`sparse`: remove `debugger`, ~10% of files; `dense`: `const` → `let`) in Putout (Babel traverse)
and Putnik (per-file `putnik()` API, and batch `parse` → `transformAll` → `printAll` with phase timings).

Medians, ms, Node 22 on x64 Linux, real files from `node_modules` (250 files, 1089 KB), SQLite via `node:sqlite`.

| files | KB   | rule   | mode   | putout | putnik per-file | putnik batch | parse+write | query | print |
|-------|------|--------|--------|--------|-----------------|--------------|-------------|-------|-------|
| 100   | 284  | sparse | report | 255    | 1954            | 788          | 786         | 1     | 0     |
| 100   | 284  | dense  | report | 214    | 3724            | 635          | 594         | 41    | 0     |
| 250   | 1089 | sparse | report | 676    | 6200            | 2107         | 2103        | 4     | 0     |
| 250   | 1089 | dense  | report | 689    | 13432           | 2210         | 1763        | 446   | 0     |
| 250   | 1089 | sparse | fix    | 9627   | 17430           | 13322        | 1829        | 38    | 11455 |
| 250   | 1089 | dense  | fix    | 11361  | 21932           | 17753        | 1876        | 4712  | 11165 |

## Findings

- The SQL query itself is cheap for rare matches (4-40 ms for 250 files), but `writeAst` dominates report mode.
- Report mode: Putout is ~3x faster. Fix mode: Putnik is ~1.4-1.6x slower, dominated by `readAst` + print.
- Per-file `putnik()` rebuilds all tables and indexes per call: 3-6x slower than batch.
- Break-even needs the write cost amortized (many rules on one DB, or a persistent DB with incremental parsing).

## Notes

- `node bench/leak-repro.js` shows memory stays flat across `putnik()` calls. With `libsql` it grew ~1.8 MB per call:
  `libsql` keeps the whole in-memory database after `close()` once any statement was prepared. `node:sqlite` does not.
- Not preserved by the DB roundtrip yet: directives (`'use strict'`), parentheses (`a - (b + 1)`), optional chaining (`?.`),
  string escapes and regexp flags.
