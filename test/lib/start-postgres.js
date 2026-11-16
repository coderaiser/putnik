import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createConnection} from 'node:net';
import process from 'node:process';
import {setTimeout} from 'node:timers';
import {createDb} from '../../lib/db/postgres.js';

export const startPostgres = async () => {
    const dir = mkdtempSync(join(tmpdir(), 'putnik-pg-'));
    const port = 5433 + Math.floor(Math.random() * 1000);
    
    const proc = spawn('pgsqlite', [
        '--database',
        join(dir, 'test.db'),
        '--port',
        String(port),
    ], {
        stdio: 'ignore',
        env: {
            ...process.env,
            PGSQLITE_RATE_LIMIT_MAX_REQUESTS: '100000000',
            PGSQLITE_RATE_LIMIT_PER_IP: '100000000',
        },
    });
    
    await waitForPort(port);
    const url = `postgresql://localhost:${port}/test`;
    const db = await createDb(url);
    
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
        url,
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
