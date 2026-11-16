import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'supertape';
import {
    parse,
    printAll,
    transformAll,
    loadSqlPlugin,
} from '../lib/putnik.js';
import {startPostgres} from './lib/start-postgres.js';

const removeDebugger = loadSqlPlugin(new URL('../lib/plugins/remove-debugger.sql', import.meta.url).pathname);

const startPglite = async () => {
    const dir = await mkdtemp(join(tmpdir(), 'putnik-pglite-'));
    
    return {
        database: {
            dialect: 'pglite',
            connection: dir,
        },
        stop: () => rm(dir, {
            recursive: true,
            force: true,
        }),
    };
};

const startPg = async () => {
    const {url, stopPostgres} = await startPostgres();
    
    return {
        database: {
            dialect: 'postgres',
            connection: url,
        },
        stop: stopPostgres,
    };
};

const checkRoundTrip = async (start) => {
    const {database, stop} = await start();
    const db = await parse('/p/a.js', 'const a = 1;\n', {
        database,
    });
    
    const printed = await printAll(['/p/a.js'], db);
    
    await db.end();
    await stop();
    
    return printed.get('/p/a.js');
};

const checkFind = async (start) => {
    const {database, stop} = await start();
    const db = await parse('/p/a.js', 'debugger;\n', {
        database,
    });
    
    const places = await transformAll(['/p/a.js'], db, {
        plugins: [
            ['remove-debugger', removeDebugger],
        ],
    });
    
    await db.end();
    await stop();
    
    return places.map(({file}) => file);
};

test('adapters: pglite: round trip', async (t) => {
    const result = await checkRoundTrip(startPglite);
    
    t.equal(result, 'const a = 1;\n');
    t.end();
});

test('adapters: postgres: round trip', async (t) => {
    const result = await checkRoundTrip(startPg);
    
    t.equal(result, 'const a = 1;\n');
    t.end();
});

test('adapters: pglite: find reports a place', async (t) => {
    const result = await checkFind(startPglite);
    const expected = ['/p/a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('adapters: postgres: find reports a place', async (t) => {
    const result = await checkFind(startPg);
    const expected = ['/p/a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});
