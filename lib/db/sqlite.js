import Database from 'libsql';
import {montag} from 'montag';
import {prepare} from './prepare.js';

const noop = () => {};
const createTransaction = (db) => (fn) => {
    db.exec('BEGIN');
    
    let result;
    
    try {
        result = fn();
    } catch (e) {
        db.exec('ROLLBACK');
        throw e;
    }
    
    if (result && typeof result.then === 'function') {
        const rollback = (e) => {
            db.exec('ROLLBACK');
            throw e;
        };
        
        return result
            .then((res) => {
                db.exec('COMMIT');
                return res;
            })
            .catch(rollback);
    }
    
    db.exec('COMMIT');
    return result;
};

export const createDb = (connection = ':memory:') => {
    const db = new Database(connection);
    
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    const upsert = (table, key, data) => {
        const cols = Object.keys(data);
        const placeholders = Array(cols.length).fill('?');
        
        db
            .prepare(montag`
                INSERT OR REPLACE
                    INTO "${table}" (${cols.join(', ')}) 
                    VALUES (${placeholders.join(', ')})
            `)
            .run(Object.values(data));
    };
    
    const exec = db.exec.bind(db);
    
    return {
        dialect: 'sqlite',
        primaryKey: 'INTEGER PRIMARY KEY',
        run: prepare(db, 'run'),
        all: prepare(db, 'all'),
        get: prepare(db, 'get'),
        insert: prepare(db, 'get', 'RETURNING id', 'id'),
        exec,
        transaction: createTransaction(db),
        upsert,
        end: noop,
    };
};
