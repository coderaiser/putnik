import {createClient} from '@libsql/client';
import {tryToCatch} from 'try-to-catch';

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
        
        const rows = [];
        
        for (const row of result.rows)
            rows.push(row);
        
        return rows;
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
        const placeholders = [];
        
        for (const col of cols)
            placeholders.push(`:${col}`);
        
        const notKey = (c) => c !== key;
        const setCols = [];
        
        for (const col of cols) {
            if (notKey(col))
                setCols.push(`${col} = excluded.${col}`);
        }
        
        await client.execute({
            sql: `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
                  ON CONFLICT (${key}) DO UPDATE SET ${setCols.join(', ')}`,
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
