import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {NODE_COLUMNS} from './node-columns.js';

const {version} = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const TABLES = [
    ...Object.keys(NODE_COLUMNS),
    'Comments',
    'Extra',
    'Binding',
    'Reference',
    'Changed',
    'FileHash',
];

export const getHash = (text) => createHash('sha1')
    .update(text)
    .digest('hex');

export const getSignature = () => getHash(JSON.stringify([version, NODE_COLUMNS]));

export const createSyncTables = async (db) => {
    await db.exec('CREATE TABLE IF NOT EXISTS FileHash (file TEXT PRIMARY KEY, hash TEXT NOT NULL)');
    await db.exec('CREATE TABLE IF NOT EXISTS Changed (file TEXT PRIMARY KEY)');
    await db.exec('CREATE TABLE IF NOT EXISTS SyncMeta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
};

const getMeta = async (db, key) => {
    const row = await db.get('SELECT value FROM SyncMeta WHERE key = :key', {
        key,
    });
    
    if (!row)
        return '';
    
    return row.value;
};

const setMeta = (db, key, value) => db.upsert('SyncMeta', 'key', {
    key,
    value,
});

const reset = async (db) => {
    for (const table of TABLES)
        await db.run(`DELETE FROM ${table}`);
};

export const hasBindings = async (db) => await getMeta(db, 'bindings') === '1';

export const openSync = async (db, {bindings = false} = {}) => {
    const signature = getSignature();
    const savedSignature = await getMeta(db, 'signature');
    const hasSaved = await hasBindings(db);
    const isNewSignature = signature !== savedSignature;
    const needsBindings = bindings && !hasSaved;
    
    if (isNewSignature || needsBindings)
        await reset(db);
    
    await setMeta(db, 'signature', signature);
    await setMeta(db, 'bindings', bindings || hasSaved ? '1' : '0');
};

export const isFresh = async (db, file, fileHash) => {
    const row = await db.get('SELECT hash FROM FileHash WHERE file = :file', {
        file,
    });
    
    if (!row)
        return false;
    
    return row.hash === fileHash;
};

export const saveHash = (db, file, fileHash) => db.upsert('FileHash', 'file', {
    file,
    hash: fileHash,
});

export const getFiles = async (db) => {
    const rows = await db.all('SELECT file FROM FileHash ORDER BY file');
    
    return rows.map(({file}) => file);
};

export const dropFile = async (db, file) => {
    for (const table of TABLES)
        await db.run(`DELETE FROM ${table} WHERE file = :file`, {
            file,
        });
    
    await db.run('DELETE FROM SweepFile WHERE file = :file', {
        file,
    });
};

export const dropMissing = async (db, files) => {
    const known = new Set(files);
    
    for (const file of await getFiles(db))
        if (!known.has(file))
            await dropFile(db, file);
};

export const markChanged = async (db, files) => {
    for (const file of files)
        await db.run('INSERT INTO Changed (file) VALUES (:file) ON CONFLICT DO NOTHING', {
            file,
        });
};

export const getChanged = async (db) => {
    const rows = await db.all('SELECT file FROM Changed ORDER BY file');
    
    return rows.map(({file}) => file);
};

export const clearChanged = (db, file) => db.run('DELETE FROM Changed WHERE file = :file', {
    file,
});
