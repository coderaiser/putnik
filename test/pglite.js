import {tryToCatch} from 'try-to-catch';
import {createTest} from '#test';
import {createDb} from './pglite.js';

const test = createTest(createDb);

test('pglite: exec creates table', async ({exec, notOk}) => {
    const [error] = await tryToCatch(exec, 'CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    notOk(error);
});

test('pglite: all returns matching rows', async ({all, exec, run, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
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

test('pglite: all returns empty array', async ({all, exec, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    const rows = await all('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    
    const expected = [];
    
    deepEqual(rows, expected);
});

test('pglite: get returns first row', async ({get, exec, run, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const row = await get('SELECT x FROM t WHERE x = :x', {
        x: 'hello',
    });
    
    const expected = {
        id: 1,
        x: 'hello',
    };
    
    deepEqual(row, expected);
});

test('pglite: get returns null on miss', async ({get, exec, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    const row = await get('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    
    equal(row, null);
});

test('pglite: insert returns id', async ({insert, exec, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    const id = await insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    
    equal(id, 1);
});

test('pglite: insert auto-increments', async ({insert, exec, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'a',
    });
    const id = await insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'b',
    });
    
    equal(id, 2);
});

test('pglite: upsert inserts new row', async ({upsert, exec, get, equal}) => {
    await exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    const row = await get('SELECT value FROM kv WHERE key = :key', {
        key: 'foo',
    });
    
    equal(row, 'bar');
});

test('pglite: upsert replaces existing row', async ({upsert, exec, get, equal}) => {
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
    
    await equal(row, 'baz');
});

test('pglite: transaction commits', async ({run, transaction, get, exec, deepEqual}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await transaction(async () => {
        await run('INSERT INTO t (x) VALUES (:x)', {
            x: 'hello',
        });
    });
    const row = await get('SELECT x FROM t');
    const expected = {
        id: 1,
        x: 'hello',
    };
    
    deepEqual(row, expected);
});

test('pglite: end does not throw', async ({notOk, end}) => {
    const [error] = await tryToCatch(end);
    await notOk(error);
});
