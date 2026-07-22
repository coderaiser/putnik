import postgres from 'postgres';
import {namedToPositional} from './named-to-positional.js';

export const createDb = async (connection) => {
    const sql = postgres(connection);
    await sql`SELECT 1`;
    
    // verify connection
    const run = async (query, params = {}) => {
        const {sql: q, values} = namedToPositional(query, params);
        await sql.unsafe(q, values);
    };
    
    const all = async (query, params = {}) => {
        const {sql: q, values} = namedToPositional(query, params);
        return [...await sql.unsafe(q, values)];
    };
    
    const get = async (query, params = {}) => {
        const rows = await all(query, params);
        return rows[0] ?? null;
    };
    
    const insert = async (query, params) => {
        const {sql: q, values} = namedToPositional(`${query} RETURNING id`, params ?? {});
        const rows = await sql.unsafe(q, values);
        
        return rows[0].id;
    };
    
    const exec = async (query) => {
        await sql.unsafe(query);
    };
    
    const transaction = async (fn) => {
        await sql.begin(fn);
    };
    
    const upsert = async (table, key, data) => {
        const cols = Object.keys(data);
        const vals = Object.values(data);
        
        const placeholders = cols
            .map((_, i) => `$${i + 1}`)
            .join(', ');
        
        const setCols = cols
            .filter((c) => c !== key)
            .map((c) => `${c} = EXCLUDED.${c}`)
            .join(', ');
        
        await sql.unsafe(`INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders})
             ON CONFLICT (${key}) DO UPDATE SET ${setCols}`, vals);
    };
    
    return {
        dialect: 'postgres',
        primaryKey: 'INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
        run,
        all,
        get,
        insert,
        exec,
        transaction,
        upsert,
        end: () => sql.end(),
    };
};
