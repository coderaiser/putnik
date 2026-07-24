import {exec} from 'node:child_process';
import {tryToCatch} from 'try-to-catch';
import {createTest} from '#test';
import {createDb} from './test.js';

const test = createTest(createDb);

test('test: exec creates table', async ({exec, notOk}) => {
    const [error] = await tryToCatch(exec, 'CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    notOk(error);
});

test('test: all returns matching rows', async ({run, all, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    
    const rows = all('SELECT * FROM t WHERE x = :x', {
        x: 'hello',
    });
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    deepEqual(rows, expected);
});

test('test: all returns empty array', async ({exec, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const rows = await all('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    
    const expected = [];
    
    deepEqual(rows, expected);
});

test('test: get returns first row', async ({exec, get, run, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const row = await get('SELECT * FROM t WHERE x = :x', {
        x: 'hello',
    });
    
    const expected = {
        id: 1,
        x: 'hello',
    };
    
    deepEqual(row, expected);
});

test('test: get returns null on miss', async ({exec, get, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const row = await get('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    
    equal(row, null);
});

test('test: insert returns id', async ({exec, insert, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const id = await insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    
    equal(id, 1);
});

test('test: insert auto-increments', async ({exec, insert, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'a',
    });
    const id = await insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'b',
    });
    
    equal(id, 2);
});

test('test: upsert inserts new row', async ({exec, upsert, get, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    const row = await get('SELECT value FROM kv WHERE key = :key', {
        key: 'foo',
    });
    
    const expected = {
        key: 'foo',
        value: 'bar',
    };
    
    deepEqual(row, expected);
});

test('test: upsert replaces existing row', async ({exec, upsert, get, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    await upsert('kv', 'key', {
        key: 'foo',
        value: 'baz',
    });
    const row = await get('SELECT value FROM kv WHERE key = :key', {
        key: 'foo',
    });
    
    const expected = {
        key: 'foo',
        value: 'baz',
    };
    
    deepEqual(row, expected);
});

test('test: transaction commits', async ({exec, get, run, deepEqual, transaction}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    
    transaction(async () => {
        await run('INSERT INTO t (x) VALUES (:x)', {
            x: 'hello',
        });
    });
    
    const row = await get('SELECT * FROM t');
    
    const expected = {
        id: 1,
        x: 'hello',
    };
    
    deepEqual(row, expected);
});

test('test: end does not throw', async ({end, notOk}) => {
    const [error] = await tryToCatch(end);
    notOk(error);
});

test('test: run with positional ? params', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (?)', ['hello']);
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, 'hello');
});

test('test: run with positional $1 params', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES ($1)', ['hello']);
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, 'hello');
});

test('test: all with positional ? WHERE', async ({exec, run, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await all('SELECT x FROM t WHERE x = ?', ['hello']);
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    deepEqual(rows, expected);
});

test('test: all with explicit column projection', async ({exec, run, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await all('SELECT x FROM t');
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    deepEqual(rows, expected);
});

test('test: all with named cols WHERE and projection', async ({exec, run, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await all('SELECT x FROM t WHERE x = :x', {
        x: 'hello',
    });
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    deepEqual(rows, expected);
});

test('test: all with unrecognised WHERE condition returns rows', async ({exec, run, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await all('SELECT x FROM t WHERE unknown_op > :x', {
        x: 1,
    });
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    deepEqual(rows, expected);
});

test('test: exec accepts CREATE INDEX', async ({exec, notOk}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const [error] = await tryToCatch(exec, 'CREATE INDEX IF NOT EXISTS idx ON t (x)');
    
    notOk(error);
});

test('test: exec accepts CREATE VIEW', async ({exec, notOk}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const [error] = await tryToCatch(exec, 'CREATE VIEW v AS SELECT x FROM t');
    
    notOk(error);
});

test('test: exec accepts DROP VIEW', async ({exec, notOk}) => {
    const [error] = await tryToCatch(exec, 'DROP VIEW IF EXISTS v');
    notOk(error);
});

test('test: run with @ placeholder defaults to null', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (@x)', {
        x: 'hello',
    });
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, null);
});

test('test: run ? with object params', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (?)', {
        0: 'hello',
    });
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, 'hello');
});

test('test: run $1 with object params defaults to null', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES ($1)', {
        x: 'hello',
    });
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, null);
});

test('test: run ? with empty object defaults to null', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (?)', {});
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, null);
});

test('test: run :x with missing param defaults to null', async ({exec, equal, run, get}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {});
    const row = await get('SELECT x FROM t');
    
    equal(row?.x, null);
});

test('test: insert returns null on non-INSERT', async ({equal, insert}) => {
    const id = await insert('SELECT 1', {});
    equal(id, null);
});

test('test: all with no table returns empty', async ({all, deepEqual}) => {
    const rows = await all('SELECT 1');
    const expected = [];
    
    deepEqual(rows, expected);
});

test('test: all positional WHERE with object params', async ({exec, all, run, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = all('SELECT * FROM t WHERE x = ?', {
        0: 'hello',
    });
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    deepEqual(rows, expected);
});

test('test: all WHERE with missing named param', async ({exec, run, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await all('SELECT * FROM t WHERE x = :x', {});
    const expected = [];
    
    deepEqual(rows, expected);
});

test('test: all with EXISTS returns rows when type exists', async ({exec, run, deepEqual, all}) => {
    await exec('CREATE TABLE IF NOT EXISTS Program (id INTEGER PRIMARY KEY, file TEXT)');
    await run('INSERT INTO Program (file) VALUES (:file)', {
        file: 'test.js',
    });
    const rows = await all(`SELECT 'Program' AS type WHERE EXISTS(SELECT 1 FROM "Program" WHERE file = ?)`, ['test.js']);
    
    const expected = [{
        file: 'test.js',
        id: 1,
    }];
    
    deepEqual(rows, expected);
});

test('test: all with EXISTS returns empty when no rows', async ({deepEqual, all}) => {
    const rows = await all(`SELECT 'Program' AS type WHERE EXISTS(SELECT 1 FROM "Program" WHERE file = ?)`, ['missing.js']);
    const expected = [];
    
    deepEqual(rows, expected);
});

test('test: all on nonexistent table returns empty', ({all, deepEqual}) => {
    const rows = all('SELECT * FROM nonexistent');
    const expected = [];
    
    deepEqual(rows, expected);
});

test('test: all positional WHERE with empty object params', async ({run, all, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    
    const rows = await all('SELECT * FROM t WHERE x = ?', {});
    const expected = [];
    
    deepEqual(rows, expected);
});
