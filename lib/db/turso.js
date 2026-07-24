import {createClient} from '@libsql/client';
import {tryToCatch} from 'try-to-catch';

const not = (fn) => (...args) => !fn(...args);
const equal = (a) => (b) => a === b;
const addPrefix = (prefix) => (value) => `${prefix}${value}`;

export const createDb = async ({url, authToken}) => {
    const client = createClient({
        url,
        authToken,
    });
    
    await client.execute('SELECT 1');
    
    const run = async (query, params = {}) => {
        await client.execute({
            sql: query,
            args: params,
        });
    };
    
    const all = async (query, params = {}) => {
        const result = await client.execute({
            sql: query,
            args: params,
        });
        
        const toObject = (r) => ({
            ...r,
        });
        
        return result.rows.map(toObject);
    };
    
    const get = async (query, params = {}) => {
        const rows = await all(query, params);
        return rows[0] ?? null;
    };
    
    const insert = async (query, params = {}) => {
        const result = await client.execute({
            sql: `${query} RETURNING id`,
            args: params,
        });
        
        return result.rows[0].id;
    };
    
    const exec = async (query) => {
        await client.execute(query);
    };
    
    const transaction = async (fn) => {
        const tx = await client.transaction('write');
        const [e] = await tryToCatch(fn, tx);
        
        if (e) {
            await tx.rollback();
            throw e;
        }
        
        await tx.commit();
    };
    
    const upsert = async (table, key, data) => {
        const cols = Object.keys(data);
        
        const addColon = addPrefix(':');
        const notKey = not(equal(key));
        const addExcluded = (c) => `${c} = excluded.${c}`;
        
        const placeholders = cols
            .map(addColon)
            .join(', ');
        
        const setCols = cols
            .filter(notKey)
            .map(addExcluded)
            .join(', ');
        
        await client.execute({
            sql: `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders})
                  ON CONFLICT (${key}) DO UPDATE SET ${setCols}`,
            args: data,
        });
    };
    
    return {
        dialect: 'turso',
        primaryKey: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        run,
        all,
        get,
        insert,
        exec,
        transaction,
        upsert,
        end: async () => client.close(),
    };
};
