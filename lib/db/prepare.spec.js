import {test} from 'supertape';
import {createDb} from './sqlite.js';

test('prepare: insert without params returns id', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, x INTEGER)');
    const result = db.insert('INSERT INTO t (x) VALUES (42)');
    
    t.equal(result, 1);
    t.end();
});

test('prepare: insert with params returns id', (t) => {
    const db = createDb();
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, x INTEGER)');
    const result = db.insert('INSERT INTO t (x) VALUES (?)', [42]);
    
    t.equal(result, 1);
    t.end();
});
