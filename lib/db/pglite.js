import {PGlite} from '@electric-sql/pglite';
import {namedToPositional} from './named-to-positional.js';

const not = (fn) => (...args) => !fn(...args);
const equal = (a) => (b) => a === b;

export const createDb = async (connection) => {
    const db = new PGlite(connection);
    await db.waitReady;
    
    const run = async (query, params = {}) => {
        const {sql, values} = namedToPositional(query, params);
        await db.query(sql, values);
    };
    
    const all = async (query, params = {}) => {
        const {sql, values} = namedToPositional(query, params);
        const result = await db.query(sql, values);
        
        return result.rows;
    };
    
    const get = async (query, params = {}) => {
        const rows = await all(query, params);
        return rows[0] ?? null;
    };
    
    const insert = async (query, params = {}) => {
        const {sql, values} = namedToPositional(`${query} RETURNING id`, params);
        const result = await db.query(sql, values);
        
        return result.rows[0].id;
    };
    
    const exec = async (query) => {
        await db.exec(query);
    };
    
    const transaction = async (fn) => {
        await db.transaction(fn);
    };
    
    const upsert = async (table, key, data) => {
        const cols = Object.keys(data);
        const vals = Object.values(data);
        const notKey = not(equal(key));
        const toPositional = (_, i) => `$${i + 1}`;
        const addExcluded = (c) => `${c} = EXCLUDED.${c}`;
        
        const placeholders = cols
            .map(toPositional)
            .join(', ');
        const setCols = cols
            .filter(notKey)
            .map(addExcluded)
            .join(', ');
        
        await db.query(`INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders})
             ON CONFLICT (${key}) DO UPDATE SET ${setCols}`, vals);
    };
    
    return {
        dialect: 'pglite',
        primaryKey: 'INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
        run,
        all,
        get,
        insert,
        exec,
        transaction,
        upsert,
        end: async () => db.close(),
    };
};
