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

test('sqlite: end is a noop', (t) => {
    const db = createDb();
    const result = db.end();
    
    t.notOk(result);
    t.end();
});
