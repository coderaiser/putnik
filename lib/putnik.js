import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import putout from 'putout';
import {NODE_COLUMNS} from './node-columns.js';
import {
    createScopeTables,
    createScopeIndexes,
    writeScope,
} from './scope.js';
import {writeAst} from './writer.js';
import {readAst} from './read-ast.js';
import {
    createSyncTables,
    openSync,
    isFresh,
    saveHash,
    dropFile,
    dropMissing,
    markChanged,
    getHash,
} from './sync.js';
import {
    branch,
    merge,
    getPrinter,
} from './processor.js';
import {getEntries} from './entries.js';
import {runPlugin} from './runner.js';
import {createDb as createSqliteDb} from './db/sqlite.js';
import {
    extractSections,
    hasWhereClause,
    loadSqlPlugin,
    validatePlugin,
} from './sql-plugin/sql-plugin.js';

export {runPlugin} from './runner.js';
export {writeAst, writeComments} from './writer.js';
export {readAst} from './read-ast.js';
export {
    extractSections,
    hasWhereClause,
    loadSqlPlugin,
    validatePlugin,
} from './sql-plugin/sql-plugin.js';

const {isArray} = Array;
const maybeArray = (a) => isArray(a) ? a : [a];

const isString = (a) => typeof a === 'string';

export const sql = (strings, ...values) => {
    const result = [];
    
    for (const [i, str] of strings.entries()) {
        result.push(str);
        
        if (i < values.length)
            result.push(values[i]);
    }
    
    return result.join('');
};

const DIALECTS = {
    postgres: './db/postgres.js',
    pglite: './db/pglite.js',
    turso: './db/turso.js',
};

export const createDb = async (database) => {
    if (!database || isString(database))
        return createSqliteDb(database);
    
    const path = DIALECTS[database.dialect];
    
    if (!path)
        return createSqliteDb(database.connection);
    
    const {createDb: createDialectDb} = await import(path);
    
    return createDialectDb(database.connection);
};

export const createTable = async (db, type) => {
    const extra = NODE_COLUMNS[type] ? `, ${NODE_COLUMNS[type]}` : '';
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ${type} (
            id           ${db.primaryKey},
            file         TEXT NOT NULL,
            parent_id    INTEGER,
            parent_type  TEXT,
            parent_field TEXT,
            start_line   INT,
            start_col    INT,
            end_line     INT,
            end_col      INT
            ${extra}
        )
    `);
};

export const createCommentsTable = async (db) => {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Comments (
            id           ${db.primaryKey},
            file         TEXT NOT NULL,
            node_id      INTEGER NOT NULL,
            node_type    TEXT NOT NULL,
            type         TEXT NOT NULL,
            value        TEXT NOT NULL,
            is_leading   INTEGER NOT NULL DEFAULT 0,
            is_trailing  INTEGER NOT NULL DEFAULT 0,
            is_inner     INTEGER NOT NULL DEFAULT 0,
            start_line   INTEGER,
            start_col    INTEGER,
            end_line     INTEGER,
            end_col      INTEGER,
            UNIQUE(file, start_line, start_col, node_type, node_id)
        )
    `);
};

export const createExtraTable = async (db) => {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Extra (
            id           ${db.primaryKey},
            file         TEXT NOT NULL,
            node_id      INTEGER NOT NULL,
            node_type    TEXT NOT NULL,
            parenthesized INTEGER NOT NULL DEFAULT 0,
            trailing_comma INTEGER NOT NULL DEFAULT 0
        )
    `);
};

export const createAllTables = async (db) => {
    for (const type of Object.keys(NODE_COLUMNS)) {
        await createTable(db, type);
    }
    
    await createCommentsTable(db);
    await createExtraTable(db);
    await createScopeTables(db);
    await createSyncTables(db);
    await db.exec('CREATE TABLE IF NOT EXISTS Entry (file TEXT PRIMARY KEY)');
};
export const createAllIndexes = async (db) => {
    for (const type of Object.keys(NODE_COLUMNS)) {
        await createIndex(db, type);
    }
    
    await createIndex(db, 'Extra');
    await createScopeIndexes(db);
};

const createIndex = async (db, type) => {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_${type}_file ON ${type} (file)`);
};

const VIEWS_DIR = new URL('./views', import.meta.url).pathname;

export const createNodesView = async (db) => {
    const selects = Object
        .keys(NODE_COLUMNS)
        .map((type) => `SELECT '${type}' AS type, id, file, parent_id, parent_type, parent_field FROM ${type}`);
    
    await db.exec(`DROP VIEW IF EXISTS nodes`);
    await db.exec(`CREATE VIEW nodes AS ${selects.join(' UNION ALL ')}`);
};

export const createSharedViews = async (db) => {
    await createNodesView(db);
    
    const files = readdirSync(VIEWS_DIR).filter((f) => f.endsWith('.sql'));
    
    for (const file of files) {
        const name = file.replace('.sql', '');
        const sql = readFileSync(join(VIEWS_DIR, file), 'utf8');
        
        await db.exec(`DROP VIEW IF EXISTS ${name}`);
        await db.exec(sql);
    }
};

export const transform = async (file, db, options = {}) => {
    const places = [];
    const {
        plugins = [],
        rules = {},
        fix = true,
        scope,
    } = options;
    
    for (const [pluginName, plugin] of plugins) {
        if (rules[pluginName] === 'off')
            continue;
        
        if (scope && scope !== (plugin.scope || 'file'))
            continue;
        
        const foundPlaces = await runPlugin(db, plugin, file, {
            fix,
        });
        
        places.push(...foundPlaces.map((place) => ({
            ...place,
            rule: pluginName,
        })));
    }
    
    if (fix)
        await markChanged(db, new Set(places.map(({file}) => file)));
    
    return places;
};

export const print = async (file, db) => {
    if (!db)
        throw Error(`☝️Looks like 'db' is missing`);
    
    const ast = await readAst(db, file);
    
    const printed = putout.print(ast, {
        printer: getPrinter(file),
    });
    
    return merge(file, printed);
};

const getParseOptions = (name) => {
    if (/\.[cm]?ts$/.test(name))
        return {
            isTS: true,
        };
    
    if (name.endsWith('.tsx'))
        return {
            isTS: true,
            isJSX: true,
        };
};

const isPackage = (name) => name.endsWith('/package.json');

const getEntryFiles = (names, sources) => {
    const entries = [];
    
    for (const [i, name] of names.entries()) {
        if (!isPackage(name))
            continue;
        
        entries.push(...getEntries(name, JSON.parse(sources[i]), names));
    }
    
    return entries;
};

export const parse = async (nameOrNames, sourceOrSources, options = {}) => {
    const names = maybeArray(nameOrNames);
    const sources = maybeArray(sourceOrSources);
    const db = await createDb(options.database);
    
    await db.transaction(async () => {
        await createAllTables(db);
    });
    
    await openSync(db, options);
    await dropMissing(db, names);
    
    await db.transaction(async () => {
        for (const [i, name] of names.entries()) {
            const fileHash = getHash(sources[i]);
            
            if (await isFresh(db, name, fileHash))
                continue;
            
            await dropFile(db, name);
            
            const ast = putout.parse(branch(name, sources[i]), getParseOptions(name));
            
            await writeAst(db, ast, name);
            
            if (options.bindings)
                await writeScope(db, ast, name);
            
            await saveHash(db, name, fileHash);
        }
    });
    
    await db.run('DELETE FROM Entry');
    
    for (const file of getEntryFiles(names, sources))
        await db.run('INSERT INTO Entry (file) VALUES (:file) ON CONFLICT DO NOTHING', {
            file,
        });
    
    await createSharedViews(db);
    
    await db.transaction(async () => {
        await createAllIndexes(db);
    });
    
    return db;
};

export const transformAll = async (files, db, options = {}) => {
    const places = [];
    
    for (const file of files)
        places.push(...await transform(file, db, {
            ...options,
            scope: 'file',
        }));
    
    places.push(...await transform(null, db, {
        ...options,
        scope: 'project',
    }));
    
    return places;
};

export const printAll = async (files, db) => {
    const result = new Map();
    
    for (const file of files)
        result.set(file, await print(file, db));
    
    return result;
};

export default async function putnik(file, source, options = {}) {
    const {
        fix = true,
        plugins = [],
        rules = {},
    } = options;
    
    const db = await parse(file, source, options);
    
    try {
        const places = await transform(file, db, {
            plugins,
            rules,
            fix,
        });
        
        if (!fix && !places.length)
            return [source, places];
        
        const code = await print(file, db);
        
        return [code, places];
    } finally {
        await db.end();
    }
}
