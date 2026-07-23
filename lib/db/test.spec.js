import {createTest} from '#test';
import {createDb} from './test.js';
import {tryToCatch} from 'try-to-catch';

const test = createTest(createDb);

test('test: exec creates table', async ({db, pass}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await pass('exec did not throw');
});

test('test: all returns matching rows', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const rows = await db.all('SELECT * FROM t WHERE x = :x', {
        x: 'hello',
    });
    await all(rows, [{
        id: 1,
        x: 'hello',
    }]);
});

test('test: all returns empty array', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const rows = await db.all('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    await all(rows, []);
});

test('test: get returns first row', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    const row = await db.get('SELECT * FROM t WHERE x = :x', {
        x: 'hello',
    });
    await get(row, {
        id: 1,
        x: 'hello',
    });
});

test('test: get returns null on miss', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const row = await db.get('SELECT x FROM t WHERE x = :x', {
        x: 'missing',
    });
    await get(row, null);
});

test('test: insert returns id', async ({db, insert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'hello',
    });
    await insert(id, 1);
});

test('test: insert auto-increments', async ({db, insert}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'a',
    });
    const id = await db.insert('INSERT INTO t (x) VALUES (:x)', {
        x: 'b',
    });
    await insert(id, 2);
});

test('test: upsert inserts new row', async ({db, upsert}) => {
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

test('test: upsert replaces existing row', async ({db, upsert}) => {
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

test('test: transaction commits', async ({db, get}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.transaction(async () => {
        await db.run('INSERT INTO t (x) VALUES (:x)', {
            x: 'hello',
        });
    });
    const row = await db.get('SELECT * FROM t');
    await get(row, {
        id: 1,
        x: 'hello',
    });
});

test('test: end does not throw', async ({db, pass}) => {
    await db.end();
    await pass('end did not throw');
});

test('test: dialect is a non-empty string', async ({db, dialect}) => {
    await dialect(db.dialect);
});


test('test: run with positional ? params', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (?)', ['hello']);
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, 'hello');
});

test('test: run with positional $1 params', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES ($1)', ['hello']);
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, 'hello');
});

test('test: all with positional ? WHERE', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT x FROM t WHERE x = ?', ['hello']);
    await all(rows, [{x: 'hello'}]);
});

test('test: all with explicit column projection', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT x FROM t');
    await all(rows, [{x: 'hello'}]);
});

test('test: all with named cols WHERE and projection', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT x FROM t WHERE x = :x', {x: 'hello'});
    await all(rows, [{x: 'hello'}]);
});

test('test: all with unrecognised WHERE condition returns rows', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT x FROM t WHERE unknown_op > :x', {x: 1});
    await all(rows, [{x: 'hello'}]);
});

test('test: exec accepts CREATE INDEX', async ({db, notOk}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const [error] = await tryToCatch(db.exec.bind(db), 'CREATE INDEX IF NOT EXISTS idx ON t (x)');
    notOk(error);
});

test('test: exec accepts CREATE VIEW', async ({db, notOk}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    const [error] = await tryToCatch(db.exec.bind(db), 'CREATE VIEW v AS SELECT x FROM t');
    notOk(error);
});

test('test: exec accepts DROP VIEW', async ({db, notOk}) => {
    const [error] = await tryToCatch(db.exec.bind(db), 'DROP VIEW IF EXISTS v');
    notOk(error);
});


test('test: run with @ placeholder defaults to null', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (@x)', {x: 'hello'});
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, null);
});

test('test: run ? with object params', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (?)', {0: 'hello'});
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, 'hello');
});

test('test: run $1 with object params defaults to null', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES ($1)', {x: 'hello'});
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, null);
});

test('test: run ? with empty object defaults to null', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (?)', {});
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, null);
});

test('test: run :x with missing param defaults to null', async ({db, equal}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {});
    const row = await db.get('SELECT x FROM t');
    await equal(row?.x, null);
});

test('test: insert returns null on non-INSERT', async ({db, equal}) => {
    const id = await db.insert('SELECT 1', {});
    await equal(id, null);
});

test('test: all with no table returns empty', async ({db, all}) => {
    const rows = await db.all('SELECT 1');
    await all(rows, []);
});

test('test: all positional WHERE with object params', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT * FROM t WHERE x = ?', {0: 'hello'});
    await all(rows, [{id: 1, x: 'hello'}]);
});

test('test: all WHERE with missing named param', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT * FROM t WHERE x = :x', {});
    await all(rows, []);
});

test('test: all on nonexistent table returns empty', async ({db, all}) => {
    const rows = await db.all('SELECT * FROM nonexistent');
    await all(rows, []);
});

test('test: all positional WHERE with empty object params', async ({db, all}) => {
    await db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, x TEXT)');
    await db.run('INSERT INTO t (x) VALUES (:x)', {x: 'hello'});
    const rows = await db.all('SELECT * FROM t WHERE x = ?', {});
    await all(rows, []);
});

