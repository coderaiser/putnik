import Database from 'libsql';
import {prepare} from './prepare.js';

export const createDb = (connection = ':memory:') => {
    const db = new Database(connection);
    
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    const upsert = (table, key, data) => {
        const cols = Object.keys(data);
        const placeholders = [];
        
        for (const col of cols)
            placeholders.push('?');
        
        db.prepare(
            `INSERT OR REPLACE INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
        ).run(Object.values(data));
    };
    
    return {
        dialect: 'sqlite',
        primaryKey: 'INTEGER PRIMARY KEY',
        run: prepare(db, 'run'),
        all: prepare(db, 'all'),
        get: prepare(db, 'get'),
        insert: prepare(db, 'get', 'RETURNING id', 'id'),
        exec: (query) => db.exec(query),
        transaction: (fn) => db.transaction(fn)(),
        upsert,
        end: () => {},
    };
};
