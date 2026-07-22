import {print, parse} from 'putout';
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

const isUndefined = (a) => typeof a === 'undefined';

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

export const createDb = async (options = {}) => {
    if (isString(options) || isUndefined(options))
        return createSqliteDb(options);
    
    if (options.dialect === 'postgres') {
        const {createDb: createPostgresDb} = await import('./db/postgres.js');
        return createPostgresDb(options.connection);
    }
    
    return createSqliteDb(options.connection);
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

export const createPutnik = async (options = {}) => {
    const db = createSqliteDb(options.connection);
    
    await createAllTables(db);
    await createView(db);
    
    return {
        async parse(file, source) {
            const ast = parse(source);
            await writeAst(db, ast, file);
            
            return ast;
        },
        
        async run(file, plugins, opts = {}) {
            const places = [];
            
            for (const plugin of plugins) {
                const found = await runPlugin(db, plugin, file, opts);
                
                for (const place of found)
                    places.push(place);
            }
            
            return places;
        },
        
        async getAst(file) {
            return await readAst(db, file);
        },
        
        async print(file) {
            const ast = await readAst(db, file);
            
            if (!ast)
                return '';
            
            return print(ast);
        },
        db,
    };
};

export const parseAndWriteToDb = async (db, file, source) => {
    const ast = parse(source);
    
    await writeAst(db, ast, file);
    await db.upsert('_sources', 'file', {
        file,
        source,
    });
    
    return ast;
};

const runPlugins = async (db, file, plugins, rules = {}, fix = true) => {
    const places = [];
    
    for (const [pluginName, plugin] of plugins) {
        if (rules[pluginName] === 'off')
            continue;
        
        const found = await runPlugin(db, plugin, file, {
            fix,
        });
        
        for (const place of found)
            places.push(place);
    }
    
    return places;
};

const printFromDb = async (db, file) => {
    const ast = await readAst(db, file);
    
    return print(ast);
};

const getSourceFromDb = async (db, file) => {
    const row = await db.get('SELECT source FROM _sources WHERE file = ?', [file]);
    
    return row.source;
};

export const transform = async (db, file, opts = {}) => {
    const {
        plugins = [],
        rules = {},
        fix = true,
    } = opts;
    
    return await runPlugins(db, file, plugins, rules, fix);
};

export default async function putnik(name, source, opts = {}) {
    const {
        fix = true,
        plugins = [],
        rules = {},
    } = opts;
    
    const db = await createDb();
    
    await createAllTables(db);
    await createView(db);
    
    await parseAndWriteToDb(db, name, source);
    
    const places = await runPlugins(db, name, plugins, rules, fix);
    const code = fix ? await printFromDb(db, name) : await getSourceFromDb(db, name);
    
    return [code, places];
}
