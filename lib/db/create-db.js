import Database from 'better-sqlite3';
import {prepare} from './prepare.js';

export const createDb = (connection = ':memory:') => {
    const db = new Database(connection);
    
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    return {
        run: prepare(db, 'run'),
        all: prepare(db, 'all'),
        get: prepare(db, 'get'),
        insert: prepare(db, 'get', `RETURNING id`, 'id'),
        exec: (query) => db.exec(query),
        transaction: (fn) => db.transaction(fn)(),
    };
};

