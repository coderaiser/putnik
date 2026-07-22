import putout from 'putout';
import {NODE_COLUMNS} from './node-columns.js';
import {writeAst} from './writer.js';
import {readAst} from './read-ast.js';
import {runPlugin} from './runner.js';
import {
    loadSqlPlugin,
    parseSqlPlugin,
    validatePlugin,
} from './sql-plugin.js';
import {createDb as createSqliteDb} from './db/sqlite.js';

export {
    loadSqlPlugin,
    parseSqlPlugin,
    validatePlugin,
} from './sql-plugin.js';
export {readAst} from './read-ast.js';
export {writeAst} from './writer.js';
export {runPlugin} from './runner.js';

const isString = (a) => typeof a === 'string';

export const sql = (strings, ...values) => {
    let result = '';
    
    for (const [i, str] of strings.entries()) {
        result += str;
        
        if (i < values.length)
            result += values[i];
    }
    
    return result;
};

export const createDb = async (database) => {
    if (!database || isString(database))
        return createSqliteDb(database);
    
    if (database.dialect === 'postgres') {
        const {createDb: createPostgresDb} = await import('./db/postgres.js');
        return createPostgresDb(database.connection);
    }
    
    return createSqliteDb(database.connection);
};

export const createTable = async (db, type) => {
    const extra = NODE_COLUMNS[type] ? `, ${NODE_COLUMNS[type]}` : '';
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS "${type}" (
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
    
    await db.exec(`CREATE INDEX IF NOT EXISTS "idx_${type}_file" ON "${type}" (file)`);
};

export const createAllTables = async (db) => {
    for (const type of Object.keys(NODE_COLUMNS))
        await createTable(db, type);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS _sources (
            file    TEXT PRIMARY KEY,
            source  TEXT NOT NULL
        )
    `);
};

export const createIndexForField = async (db, type, field) => {
    await db.exec(`
        CREATE INDEX IF NOT EXISTS "idx_${type}_${field}"
        ON "${type}" ("${field}")
    `);
};

export const createView = async (db) => {
    await db.exec(`DROP VIEW IF EXISTS file_nodes`);
    
    const branches = [];
    
    for (const type of Object.keys(NODE_COLUMNS))
        branches.push(`
            SELECT id, file, parent_id, parent_type, parent_field, '${type}' AS type,
                   start_line, start_col, end_line, end_col
            FROM   "${type}"
        `);
    
    await db.exec(`CREATE VIEW file_nodes AS ${branches.join('UNION ALL')}`);
};

export const transform = async (file, db, options = {}) => {
    const places = [];
    const {
        plugins = [],
        rules = {},
        fix = true,
    } = options;
    
    for (const [pluginName, plugin] of plugins) {
        if (rules[pluginName] === 'off')
            continue;
        
        const foundPlaces = await runPlugin(db, plugin, file, {
            fix,
        });
        
        places.push(...foundPlaces);
    }
    
    return places;
};

export const print = async (file, db) => {
    if (!db)
        throw Error(`☝️Looks like 'db' is missing`);
    
    const ast = await readAst(db, file);
    
    return putout.print(ast);
};

export const parse = async (name, source, options = {}) => {
    const {database} = options;
    const db = await createDb(database);
    
    await createAllTables(db);
    await createView(db);
    
    const ast = putout.parse(source);
    
    await writeAst(db, ast, name);
    
    return db;
};

export default async function putnik(file, source, options = {}) {
    const {
        fix = true,
        plugins = [],
        rules = {},
    } = options;
    
    const db = await parse(file, source, options);
    
    const places = await transform(file, db, {
        plugins,
        rules,
        fix,
    });
    
    if (!fix && !places.length)
        return [source, places];
    
    const code = await print(file, db);
    
    return [code, places];
}
