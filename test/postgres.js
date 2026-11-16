import {test} from 'supertape';
import {tryToCatch} from 'try-to-catch';
import {startPostgres} from './lib/start-postgres.js';

test('postgres: createDb connects', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    const {dialect} = db;
    
    await stopPostgres();
    
    t.equal(dialect, 'postgres');
    t.end();
});

const createTable = (db) => db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, x TEXT)');

test('postgres: upsert inserts a new row', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    
    await createTable(db);
    await db.upsert('t', 'id', {
        id: 1,
        x: 'a',
    });
    
    const rows = await db.all('SELECT id, x FROM t');
    
    await stopPostgres();
    
    const expected = [{
        id: 1,
        x: 'a',
    }];
    
    t.deepEqual(rows, expected);
    t.end();
});

test('postgres: upsert replaces an existing row', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    
    await createTable(db);
    await db.upsert('t', 'id', {
        id: 1,
        x: 'a',
    });
    await db.upsert('t', 'id', {
        id: 1,
        x: 'b',
    });
    
    const rows = await db.all('SELECT id, x FROM t');
    
    await stopPostgres();
    
    const expected = [{
        id: 1,
        x: 'b',
    }];
    
    t.deepEqual(rows, expected);
    t.end();
});

test('postgres: transaction: db calls inside use the transaction', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    
    await createTable(db);
    await db.transaction(async () => {
        await db.run(`INSERT INTO t (id, x) VALUES (1, 'inside')`);
    });
    
    const rows = await db.all('SELECT x FROM t');
    
    await stopPostgres();
    
    const expected = [{
        x: 'inside',
    }];
    
    t.deepEqual(rows, expected);
    t.end();
});

test('postgres: transaction: error rolls back', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    
    await createTable(db);
    await tryToCatch(db.transaction, async () => {
        await db.run(`INSERT INTO t (id, x) VALUES (1, 'inside')`);
        throw Error('boom');
    });
    
    const result = await db.all('SELECT x FROM t');
    
    await stopPostgres();
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});
