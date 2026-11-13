import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdtempSync, rmSync} from 'node:fs';
import {tryToCatch} from 'try-to-catch';
import {test} from 'supertape';
import {createDb} from './sqlite.js';

test('sqlite: upsert inserts a row', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT)');
    db.upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    const row = db.get('SELECT value FROM kv WHERE key = ?', ['foo']);
    
    t.equal(row.value, 'bar');
    t.end();
});

test('sqlite: upsert replaces existing row', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT)');
    db.upsert('kv', 'key', {
        key: 'foo',
        value: 'bar',
    });
    db.upsert('kv', 'key', {
        key: 'foo',
        value: 'baz',
    });
    const row = db.get('SELECT value FROM kv WHERE key = ?', ['foo']);
    
    t.equal(row.value, 'baz');
    t.end();
});

test('sqlite: transaction rolls back on synchronous error', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (x INTEGER)');
    
    try {
        db.transaction(() => {
            db.exec('INSERT INTO t (x) VALUES (42)');
            throw Error('boom');
        });
    } catch {}
    
    const row = db.get('SELECT x FROM t');
    
    t.notOk(row);
    t.end();
});

test('sqlite: transaction commits', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (x INTEGER)');
    db.transaction(() => {
        db.exec('INSERT INTO t (x) VALUES (42)');
    });
    const row = db.get('SELECT x FROM t');
    
    t.equal(row.x, 42);
    t.end();
});

test('sqlite: end closes the connection', async (t) => {
    const db = createDb();
    
    db.end();
    
    const [error] = await tryToCatch(async () => db.get('SELECT 1'));
    
    t.ok(error);
    t.end();
});

test('sqlite: file database uses WAL', (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'putnik-sqlite-'));
    const db = createDb(join(dir, 'putnik.db'));
    
    const {journal_mode} = db.get('PRAGMA journal_mode');
    
    db.end();
    rmSync(dir, {
        recursive: true,
        force: true,
    });
    
    t.equal(journal_mode, 'wal');
    t.end();
});
