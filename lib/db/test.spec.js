import {createTest} from '#test';
import {createDb} from './test.js';

const test = createTest(createDb);

test('test: exec creates table', async ({exec}) => {
    await exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
});

test('test: all returns matching rows', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT x FROM t WHERE x = :x', {x: 'hello'});
    await all(rows, [{id: 1, x: 'hello'}]);
});

test('test: all returns empty array', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const rows = await db.all('SELECT x FROM t WHERE x = :x', {x: 'missing'});
    await all(rows, []);
});

test('test: get returns first row', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const row = await db.get('SELECT x FROM t WHERE x = :x', {x: 'hello'});
    await get(row, {id: 1, x: 'hello'});
});

test('test: get returns null on miss', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const row = await db.get('SELECT x FROM t WHERE x = :x', {x: 'missing'});
    await get(row, null);
});

test('test: insert returns id', async ({db, insert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    await insert(id, 1);
});

test('test: insert auto-increments', async ({db, insert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.insert('INSERT INTO t (x) VALUES (:x)', {x: 'a'});
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {x: 'b'});
    await insert(id, 2);
});

test('test: upsert inserts new row', async ({db, upsert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await db.upsert('kv', 'key', {key: 'foo', value: 'bar'});
    const row = await db.get('SELECT value FROM kv WHERE key = :key', {key: 'foo'});
    await upsert(row, 'bar');
});

test('test: upsert replaces existing row', async ({db, upsert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await db.upsert('kv', 'key', {key: 'foo', value: 'bar'});
    await db.upsert('kv', 'key', {key: 'foo', value: 'baz'});
    const row = await db.get('SELECT value FROM kv WHERE key = :key', {key: 'foo'});
    await upsert(row, 'baz');
});

test('test: transaction commits', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.transaction(async () => {
        await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    });
    const row = await db.get('SELECT x FROM t');
    await get(row, {id: 1, x: 'hello'});
});

test('test: end does not throw', async ({db, pass}) => {
    await db.end();
    await pass('end did not throw');
});

test('test: dialect is a non-empty string', async ({db, dialect}) => {
    await dialect(db.dialect);
});

test('test: primaryKey is a non-empty string', async ({db, primaryKey}) => {
    await primaryKey(db.primaryKey);
});

