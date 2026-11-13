import {DatabaseSync} from 'node:sqlite';
import {montag} from 'montag';
import {prepare} from './prepare.js';

const isFn = (a) => typeof a === 'function';

const createTransaction = (db) => (fn) => {
    db.exec('BEGIN');
    
    let result;
    
    try {
        result = fn();
    } catch(e) {
        db.exec('ROLLBACK');
        throw e;
    }
    
    if (result && isFn(result.then)) {
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

const IN_MEMORY = ':memory:';

export const createDb = (connection = IN_MEMORY) => {
    const db = new DatabaseSync(connection, {
        allowUnknownNamedParameters: true,
    });
    
    // WAL is meaningless for in-memory database
    if (connection !== IN_MEMORY)
        db.exec('PRAGMA journal_mode = WAL');
    
    db.exec('PRAGMA foreign_keys = ON');
    
    const upsert = (table, key, data) => {
        const cols = Object.keys(data);
        const placeholders = Array(cols.length).fill('?');
        
        db
            .prepare(montag`
                INSERT OR REPLACE
                    INTO "${table}" (${cols.join(', ')}) 
                    VALUES (${placeholders.join(', ')})
            `)
            .run(...Object.values(data));
    };
    
    const exec = db.exec.bind(db);
    const run = prepare(db, 'run');
    const all = prepare(db, 'all');
    const get = prepare(db, 'get');
    const insert = prepare(db, 'get', 'RETURNING id', 'id');
    
    const end = () => {
        for (const query of [
            run,
            all,
            get,
            insert,
        ])
            query.clear();
        
        db.close();
    };
    
    return {
        dialect: 'sqlite',
        primaryKey: 'INTEGER PRIMARY KEY',
        run,
        all,
        get,
        insert,
        exec,
        transaction: createTransaction(db),
        upsert,
        end,
    };
};
