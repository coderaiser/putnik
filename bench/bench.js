import {readFileSync, readdirSync, statSync, existsSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import putout, {putout as run} from 'putout';
import {tryToCatch} from 'try-to-catch';
import putnik, {
    parse,
    transformAll,
    printAll,
} from '../lib/putnik.js';

const SRC_DIR = process.env.BENCH_SRC || new URL('../node_modules/putout/lib', import.meta.url).pathname;
const SIZES = (process.env.BENCH_SIZES || '10,50,200').split(',').map(Number);
const PERFILE_MAX = Number(process.env.BENCH_PERFILE_MAX || 100);
const RUNS = Number(process.env.BENCH_RUNS || 3);

const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const stat = statSync(full);
        
        if (stat.isDirectory() && name !== 'node_modules')
            walk(full, out);
        else if (name.endsWith('.js') && !name.includes('.spec.') && stat.size < 40_000)
            out.push(full);
    }
    return out;
};

const candidates = walk(SRC_DIR).sort();
const maxSize = Math.max(...SIZES);
const all = [];
let skipped = 0;
const CACHE = process.env.BENCH_CACHE || '/tmp/putnik-bench-good.json';

// keep only files that survive the DB roundtrip (destructuring etc. currently fails)
const cached = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : null;

if (cached) {
    all.push(...cached.good.slice(0, maxSize));
    skipped = cached.skipped;
}

for (const file of cached ? [] : candidates) {
    if (all.length >= maxSize)
        break;
    
    const [error] = await tryToCatch(putnik, file, readFileSync(file, 'utf8'), {
        fix: true,
        plugins: [],
    });
    
    if (error)
        skipped++;
    else
        all.push(file);
}

if (!cached)
    writeFileSync(CACHE, JSON.stringify({good: all, skipped}));

console.log(`roundtrip ok: ${all.length}, skipped (roundtrip failure): ${skipped}`);

// sparse rule: ~10% of files contain a `debugger` statement
const load = (n) => all.slice(0, n).map((file, i) => ({
    file,
    source: readFileSync(file, 'utf8') + (i % 10 === 0 ? '\ndebugger;\n' : ''),
}));

const rules = {
    sparse: {
        putout: {
            report: () => 'Unexpected debugger',
            include: () => ['DebuggerStatement'],
            fix: (path) => path.remove(),
        },
        putnik: {
            select: `SELECT id FROM DebuggerStatement`,
            report: `SELECT 'Unexpected debugger' AS message`,
            fix: `DELETE FROM DebuggerStatement`,
        },
    },
    dense: {
        putout: {
            report: () => 'Prefer let over const',
            include: () => ['VariableDeclaration'],
            filter: (path) => path.node.kind === 'const',
            fix: (path) => {
                path.node.kind = 'let';
            },
        },
        putnik: {
            select: `SELECT id FROM VariableDeclaration WHERE kind = 'const'`,
            report: `SELECT 'Prefer let over const' AS message`,
            fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE kind = 'const'`,
        },
    },
};

const time = async (fn) => {
    const t = performance.now();
    const result = await fn();
    return [performance.now() - t, result];
};

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const bench = async (fn) => {
    const times = [];
    
    for (let i = 0; i < RUNS; i++)
        times.push((await time(fn))[0]);
    
    return median(times);
};

const rows = [];

for (const size of SIZES) {
    const files = load(size);
    const bytes = files.reduce((n, f) => n + f.source.length, 0);
    
    for (const [ruleName, rule] of Object.entries(rules)) {
        for (const fix of [false, true]) {
            const putoutMs = await bench(() => {
                let found = 0;
                
                for (const {file, source} of files) {
                    const {places} = run(source, {
                        fix,
                        isTS: false,
                        rules: {},
                        plugins: [['bench', rule.putout]],
                    });
                    found += places.length;
                }
                return found;
            });
            
            // per-file API: fresh DB per call
            // putnik() never closes its DB (~1.8MB leaked per call), so cap it
            const perFileMs = size > PERFILE_MAX ? NaN : await time(async () => {
                for (const {file, source} of files) {
                    await putnik(file, source, {
                        fix,
                        plugins: [['bench', rule.putnik]],
                    });
                }
            }).then(([ms]) => ms);
            
            // batch API: one DB, phases timed
            const phases = {parse: [], query: [], print: []};
            
            await bench(async () => {
                const names = files.map((f) => f.file);
                const sources = files.map((f) => f.source);
                const [p, db] = await time(() => parse(names, sources));
                const [q] = await time(() => transformAll(names, db, {
                    fix,
                    plugins: [['bench', rule.putnik]],
                }));
                const [r] = fix ? await time(() => printAll(names, db)) : [0];
                
                phases.parse.push(p);
                phases.query.push(q);
                phases.print.push(r);
            });
            
            rows.push({
                files: size,
                kb: Math.round(bytes / 1024),
                rule: ruleName,
                mode: fix ? 'fix' : 'report',
                putout_ms: Math.round(putoutMs),
                putnik_perfile_ms: Number.isNaN(perFileMs) ? 'n/a' : Math.round(perFileMs),
                putnik_batch_ms: Math.round(median(phases.parse) + median(phases.query) + median(phases.print)),
                batch_parse_ms: Math.round(median(phases.parse)),
                batch_query_ms: Math.round(median(phases.query)),
                batch_print_ms: Math.round(median(phases.print)),
            });
        }
    }
}

console.table(rows);
console.log(JSON.stringify(rows));
