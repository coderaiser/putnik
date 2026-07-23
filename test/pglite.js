import {createTest} from '#test';
import {createDb} from './pglite.js';

const test = createTest(createDb);

test('pglite: exec creates table', async ({db, pass}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await pass('exec did not throw');
});

test('pglite: all returns matching rows', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await db.all('SELECT x FROM t WHERE x = :x', {
        x: 'hello',
    });
    await all(rows, [{
        id: 1,
        x: 'hello',
    }]);
});

test('pglite: all returns empty array', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    const rows = await db.all('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    await all(rows, []);
});

test('pglite: get returns first row', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const row = await db.get('SELECT x FROM t WHERE x = :x', {
        x: 'hello',
    });
    await get(row, {
        id: 1,
        x: 'hello',
    });
});

test('pglite: get returns null on miss', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    const row = await db.get('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    await get(row, null);
});

test('pglite: insert returns id', async ({db, insert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    await insert(id, 1);
});

test('pglite: insert auto-increments', async ({db, insert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'a',
    });
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'b',
    });
    await insert(id, 2);
});

test('pglite: upsert inserts new row', async ({db, upsert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
    await db.upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    const row = await db.get('SELECT value FROM kv WHERE key = :key', {
        key: 'foo',
    });
    await upsert(row, 'bar');
});

test('pglite: upsert replaces existing row', async ({db, upsert}) => {
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
    await upsert(row, 'baz');
});

test('pglite: transaction commits', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x TEXT)');
    await db.transaction(async () => {
        await db.run('INSERT INTO t (x) VALUES (:x)', {
            x: 'hello',
        });
    });
    const row = await db.get('SELECT x FROM t');
    await get(row, {
        id: 1,
        x: 'hello',
    });
});

test('pglite: end does not throw', async ({db, pass}) => {
    await db.end();
    await pass('end did not throw');
});

test('pglite: dialect is a non-empty string', async ({db, dialect}) => {
    await dialect(db.dialect);
});

test('pglite: primaryKey is a non-empty string', async ({db, primaryKey}) => {
    await primaryKey(db.primaryKey);
});
