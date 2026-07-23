import {test} from 'supertape';
import {createDb} from './test.js';

const isString = (a) => typeof a === 'string';

test('test: exec creates table', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    
    t.pass('exec did not throw');
    t.end();
});

test('test: all returns matching rows', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const result = await db.all('SELECT x FROM t WHERE x = :x', {
        x: 'hello',
    });
    
    const expected = [{
        id: 1,
        x: 'hello',
    }];
    
    t.deepEqual(result, expected);
    t.end();
});

test('test: all returns empty array', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const result = await db.all('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('test: get returns first row', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const result = await db.get('SELECT x FROM t WHERE x = :x', {
        x: 'hello',
    });
    
    const expected = {
        id: 1,
        x: 'hello',
    };
    
    t.deepEqual(result, expected);
    t.end();
});

test('test: get returns null on miss', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const row = await db.get('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    
    t.notOk(row);
    t.end();
});

test('test: insert returns id', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    
    t.equal(id, 1);
    t.end();
});

test('test: insert auto-increments', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'a',
    });
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'b',
    });
    
    t.equal(id, 2);
    t.end();
});

test('test: upsert inserts new row', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await db.upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    const row = await db.get('SELECT value FROM kv WHERE key = :key', {
        key: 'foo',
    });
    
    t.equal(row?.value, 'bar');
    t.end();
});

test('test: upsert replaces existing row', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await db.upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    await db.upsert('kv', 'key', {
        key: 'foo',
        value: 'baz',
    });
    const row = await db.get('SELECT value FROM kv WHERE key = :key', {
        key: 'foo',
    });
    
    t.equal(row?.value, 'baz');
    t.end();
});

test('test: transaction commits', async (t) => {
    const db = createDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.transaction(async () => {
        await db.run('INSERT INTO t (x) VALUES (:x)', {
            x: 'hello',
        });
    });
    const result = await db.get('SELECT x FROM t');
    
    const expected = {
        id: 1,
        x: 'hello',
    };
    
    t.deepEqual(result, expected);
    t.end();
});

test('test: end does not throw', async (t) => {
    const db = createDb();
    await db.end();
    
    t.pass('end did not throw');
    t.end();
});

test('test: dialect is a non-empty string', (t) => {
    const db = createDb();
    
    t.ok(isString(db.dialect) && db.dialect.length > 0);
    t.end();
});

test('test: primaryKey is a non-empty string', (t) => {
    const db = createDb();
    
    t.ok(isString(db.primaryKey) && db.primaryKey.length > 0);
    t.end();
});
