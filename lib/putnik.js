import {parse} from '@putout/babel';
import {print} from '@putout/printer';
import {NODE_COLUMNS} from './node-columns.js';
import {writeAst} from './writer.js';
import {readAst} from './reader/reader.js';
import {runPlugin} from './runner.js';
import {
    loadSqlPlugin,
    parseSqlPlugin,
    validatePlugin,
} from './sql-plugin.js';
import {createDb} from './db/create-db.js';

export {runPlugin} from './runner.js';
export {writeAst} from './writer.js';
export {readAst} from './reader/reader.js';
export {createDb} from './db/create-db.js';
export {
    loadSqlPlugin,
    parseSqlPlugin,
    validatePlugin,
} from './sql-plugin.js';

export const sql = (strings, ...values) => {
    let result = '';
    
    for (const [i, str] of strings.entries()) {
        result += str;
        
        if (i < values.length)
            result += values[i];
    }
    
    return result;
};

const BASE_COLUMNS = `
    id           INTEGER PRIMARY KEY,
    file         TEXT NOT NULL,
    parent_id    INTEGER,
    parent_type  TEXT,
    parent_field TEXT,
    start_line   INT,
    start_col    INT,
    end_line     INT,
    end_col      INT
`;

export const createTable = (db, type) => {
    const extra = NODE_COLUMNS[type] ? `, ${NODE_COLUMNS[type]}` : '';
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS "${type}" (
            ${BASE_COLUMNS}
            ${extra}
        )
    `);
    
    db.exec(`CREATE INDEX IF NOT EXISTS "idx_${type}_file" ON "${type}" (file)`);
};

export const createAllTables = (db) => {
    for (const type of Object.keys(NODE_COLUMNS))
        createTable(db, type);
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS _sources (
            file    TEXT PRIMARY KEY,
            source  TEXT NOT NULL
        )
    `);
};

export const createIndexForField = (db, type, field) => {
    db.exec(`
        CREATE INDEX IF NOT EXISTS "idx_${type}_${field}"
        ON "${type}" ("${field}")
    `);
};

export const createView = (db) => {
    db.exec(`DROP VIEW IF EXISTS file_nodes`);
    
    const branches = [];
    
    for (const type of Object.keys(NODE_COLUMNS))
        branches.push(`
            SELECT id, file, parent_id, parent_type, parent_field, '${type}' AS type,
                   start_line, start_col, end_line, end_col
            FROM   "${type}"
        `);
    
    db.exec(`CREATE VIEW file_nodes AS ${branches.join('UNION ALL')}`);
};

export const createPutnik = (options = {}) => {
    const db = createDb(options.connection);
    
    createAllTables(db);
    createView(db);
    
    return {
        parse(file, source) {
            const ast = parse(source, {
                sourceType: 'module',
                plugins: ['jsx'],
            });
            
            writeAst(db, ast, file);
            
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
        
        getAst(file) {
            return readAst(db, file);
        },
        
        print(file) {
            const ast = readAst(db, file);
            
            if (!ast)
                return '';
            
            return print(ast);
        },
        db,
    };
};

export const parseAndWriteToDb = (db, file, source) => {
    const ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    writeAst(db, ast, file);
    db.run('INSERT OR REPLACE INTO _sources (file, source) VALUES (?, ?)', [file, source]);
    
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

const printFromDb = (db, file) => {
    const ast = readAst(db, file);
    
    if (!ast)
        return '';
    
    return print(ast);
};

const getSourceFromDb = (db, file) => {
    const row = db.get('SELECT source FROM _sources WHERE file = ?', [file]);
    
    if (!row)
        return '';
    
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
    
    const db = createDb();
    
    createAllTables(db);
    createView(db);
    
    parseAndWriteToDb(db, name, source);
    
    const places = await runPlugins(db, name, plugins, rules, fix);
    const code = fix ? printFromDb(db, name) : getSourceFromDb(db, name);
    
    return [code, places];
}
