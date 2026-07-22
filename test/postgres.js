import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createConnection} from 'node:net';
import {setTimeout} from 'node:timers';
import {test} from 'supertape';
import {montag} from 'montag';
import {createDb} from '../lib/db/postgres.js';
import {
    createAllTables,
    createView,
} from '../lib/putnik.js';

test('postgres: createDb connects', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    const {dialect} = db;
    
    await stopPostgres();
    
    t.equal(dialect, 'postgres');
    t.end();
});

test('postgres: createAllTables and createView', async (t) => {
    const {db, stopPostgres} = await startPostgres();
    
    await createAllTables(db);
    await createView(db);
    const row = await db.get(montag`
        SELECT name FROM sqlite_master WHERE type='view'
    `);
    
    await stopPostgres();
    
    t.equal(row?.name, 'file_nodes');
    t.end();
});

const startPostgres = async () => {
    const dir = mkdtempSync(join(tmpdir(), 'putnik-pg-'));
    const port = 5433 + Math.floor(Math.random() * 1000);
    
    const proc = spawn('pgsqlite', [
        '--database',
        join(dir, 'test.db'),
        '--port',
        String(port),
    ]);
    
    await waitForPort(port);
    const db = await createDb(`postgresql://localhost:${port}/test`);
    
    const stopPostgres = async () => {
        await db.end();
        proc.kill();
        rmSync(dir, {
            recursive: true,
            force: true,
        });
    };
    
    return {
        db,
        stopPostgres,
    };
};

const waitForPort = (port) => new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
        const sock = createConnection(port, 'localhost');
        
        sock.on('connect', () => {
            sock.destroy();
            resolve();
        });
        sock.on('error', () => {
            if (Date.now() - start > 5000)
                return reject(Error('pgsqlite timeout'));
            
            setTimeout(check, 100);
        });
    };
    
    check();
});

