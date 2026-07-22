import {test} from 'supertape';
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createConnection} from 'node:net';
import {createDb} from '../lib/db/postgres.js';
import {createAllTables, createView} from '../lib/putnik.js';

const waitForPort = (port) => new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
        const sock = createConnection(port, 'localhost');
        sock.on('connect', () => { sock.destroy(); resolve(); });
        sock.on('error', () => {
            if (Date.now() - start > 5000) return reject(new Error('pgsqlite timeout'));
            setTimeout(check, 100);
        });
    };
    check();
});

const withPgsqlite = async (fn) => {
    const dir = mkdtempSync(join(tmpdir(), 'putnik-pg-'));
    const port = 5433 + Math.floor(Math.random() * 1000);
    const proc = spawn('pgsqlite', ['--database', join(dir, 'test.db'), '--port', String(port)]);
    
    try {
        await waitForPort(port);
        const db = await createDb(`postgresql://localhost:${port}/test`);
        await fn(db);
        await db.end();
    } finally {
        proc.kill();
        rmSync(dir, {recursive: true, force: true});
    }
};

test('postgres: createDb connects', async (t) => {
    await withPgsqlite(async (db) => {
        t.equal(db.dialect, 'postgres');
    });
    t.end();
});

test('postgres: createAllTables and createView', async (t) => {
    await withPgsqlite(async (db) => {
        await createAllTables(db);
        await createView(db);
        const row = await db.get("SELECT name FROM sqlite_master WHERE type='view'");
        t.equal(row?.name, 'file_nodes');
    });
    t.end();
});

