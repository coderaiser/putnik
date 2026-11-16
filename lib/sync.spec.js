import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdtemp, rm} from 'node:fs/promises';
import {test} from 'supertape';
import {
    parse,
    printAll,
    transformAll,
    loadSqlPlugin,
} from './putnik.js';
import {
    markChanged,
    getChanged,
    clearChanged,
    hasBindings,
    getFiles,
} from './sync.js';

const createPath = async () => {
    const dir = await mkdtemp(join(tmpdir(), 'putnik-cache-'));
    
    return {
        dir,
        database: join(dir, 'cache.db'),
    };
};

const run = async (database, files, options = {}) => {
    const names = Object.keys(files);
    const db = await parse(names, Object.values(files), {
        database,
        ...options,
    });
    
    return {
        db,
        names,
    };
};

test('sync: second parse of the same source keeps the rows', async (t) => {
    const {dir, database} = await createPath();
    const files = {
        '/p/a.js': 'const a = 1;',
    };
    
    const first = await run(database, files);
    
    first.db.run(`UPDATE Identifier SET name = 'zzz'`);
    first.db.end();
    
    const second = await run(database, files);
    const [{name}] = second.db.all('SELECT name FROM Identifier');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(name, 'zzz');
    t.end();
});

test('sync: a changed source replaces the rows', async (t) => {
    const {dir, database} = await createPath();
    
    const first = await run(database, {
        '/p/a.js': 'const a = 1;',
    });
    
    first.db.end();
    
    const second = await run(database, {
        '/p/a.js': 'const b = 1;',
    });
    
    const rows = second.db.all('SELECT name FROM Identifier');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const expected = [{
        name: 'b',
    }];
    
    t.deepEqual(rows, expected);
    t.end();
});

test('sync: a file that is not in the list is removed', async (t) => {
    const {dir, database} = await createPath();
    
    const first = await run(database, {
        '/p/a.js': 'const a = 1;',
        '/p/b.js': 'const b = 1;',
    });
    
    first.db.end();
    
    const second = await run(database, {
        '/p/a.js': 'const a = 1;',
    });
    
    const rows = second.db.all('SELECT DISTINCT file FROM Identifier');
    const [{count}] = second.db.all('SELECT COUNT(*) AS count FROM FileHash');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const expected = [[{
        file: '/p/a.js',
    }], 1];
    
    const result = [rows, count];
    
    t.deepEqual(result, expected);
    t.end();
});

test('sync: a changed file is kept when the source is the same', async (t) => {
    const {dir, database} = await createPath();
    const files = {
        '/p/a.js': 'const a = 1;',
    };
    
    const first = await run(database, files);
    
    first.db.run(`UPDATE Identifier SET name = 'zzz'`);
    await markChanged(first.db, ['/p/a.js']);
    first.db.end();
    
    const second = await run(database, files);
    const [{name}] = second.db.all('SELECT name FROM Identifier');
    const changed = await getChanged(second.db);
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const result = [name, changed];
    
    const expected = [
        'zzz',
        ['/p/a.js'],
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('sync: a changed file is dropped when the source on the disk changed', async (t) => {
    const {dir, database} = await createPath();
    
    const first = await run(database, {
        '/p/a.js': 'const a = 1;',
    });
    
    await markChanged(first.db, ['/p/a.js']);
    first.db.end();
    
    const second = await run(database, {
        '/p/a.js': 'const b = 1;',
    });
    
    const result = await getChanged(second.db);
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('sync: clearChanged removes a file from the list', async (t) => {
    const db = await parse('/p/a.js', 'const a = 1;');
    
    await markChanged(db, ['/p/a.js']);
    await clearChanged(db, '/p/a.js');
    const result = await getChanged(db);
    
    db.end();
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('sync: hasBindings is false without bindings', async (t) => {
    const db = await parse('/p/a.js', 'const a = 1;');
    const result = await hasBindings(db);
    
    db.end();
    
    t.notOk(result);
    t.end();
});

test('sync: getFiles lists the parsed files', async (t) => {
    const db = await parse(['/p/b.js', '/p/a.js'], ['', '']);
    const result = await getFiles(db);
    
    db.end();
    
    const expected = [
        '/p/a.js',
        '/p/b.js',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('sync: other files are not parsed again when one file changes', async (t) => {
    const {dir, database} = await createPath();
    
    const first = await run(database, {
        '/p/a.js': 'const a = 1;',
        '/p/b.js': 'const b = 1;',
    });
    
    first.db.run(`UPDATE Identifier SET name = 'zzz' WHERE file = '/p/a.js'`);
    first.db.end();
    
    const second = await run(database, {
        '/p/a.js': 'const a = 1;',
        '/p/b.js': 'const c = 1;',
    });
    
    const rows = second.db.all('SELECT file, name FROM Identifier ORDER BY file');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const expected = [{
        file: '/p/a.js',
        name: 'zzz',
    }, {
        file: '/p/b.js',
        name: 'c',
    }];
    
    t.deepEqual(rows, expected);
    t.end();
});

test('sync: bindings are added when the first run had none', async (t) => {
    const {dir, database} = await createPath();
    const files = {
        '/p/a.js': 'const a = 1;',
    };
    
    const first = await run(database, files);
    
    first.db.end();
    
    const second = await run(database, files, {
        bindings: true,
    });
    
    const [{count}] = second.db.all('SELECT COUNT(*) AS count FROM Binding');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(count, 1);
    t.end();
});

test('sync: bindings stay when the next run needs none', async (t) => {
    const {dir, database} = await createPath();
    const files = {
        '/p/a.js': 'const a = 1;',
    };
    
    const first = await run(database, files, {
        bindings: true,
    });
    
    first.db.end();
    
    const second = await run(database, files);
    const [{count}] = second.db.all('SELECT COUNT(*) AS count FROM Binding');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(count, 1);
    t.end();
});

test('sync: a new signature rebuilds all rows', async (t) => {
    const {dir, database} = await createPath();
    const files = {
        '/p/a.js': 'const a = 1;',
    };
    
    const first = await run(database, files);
    
    first.db.run(`UPDATE Identifier SET name = 'zzz'`);
    first.db.run(`UPDATE SyncMeta SET value = 'old' WHERE key = 'signature'`);
    first.db.end();
    
    const second = await run(database, files);
    const [{name}] = second.db.all('SELECT name FROM Identifier');
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(name, 'a');
    t.end();
});

test('sync: print of cached rows is the same as the source', async (t) => {
    const {dir, database} = await createPath();
    const files = {
        '/p/a.js': 'const a = 1;\n',
    };
    
    const first = await run(database, files);
    
    first.db.end();
    
    const second = await run(database, files);
    const printed = await printAll(second.names, second.db);
    
    second.db.end();
    await rm(dir, {
        recursive: true,
        force: true,
    });
    
    const result = printed.get('/p/a.js');
    
    t.equal(result, 'const a = 1;\n');
    t.end();
});

const plugin = loadSqlPlugin(new URL('plugins/remove-debugger.sql', import.meta.url).pathname);

test('sync: transform with fix marks the file as changed', async (t) => {
    const db = await parse('/p/a.js', 'debugger;\n');
    
    await transformAll(['/p/a.js'], db, {
        fix: true,
        plugins: [
            ['remove-debugger', plugin],
        ],
    });
    const result = await getChanged(db);
    
    db.end();
    
    const expected = ['/p/a.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('sync: transform without fix does not mark the file', async (t) => {
    const db = await parse('/p/a.js', 'debugger;\n');
    
    await transformAll(['/p/a.js'], db, {
        fix: false,
        plugins: [
            ['remove-debugger', plugin],
        ],
    });
    const result = await getChanged(db);
    
    db.end();
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});
