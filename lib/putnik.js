import Database from 'better-sqlite3';
import {parse} from '@putout/babel';
import {print} from '@putout/printer';
import {NODE_COLUMNS} from './node-columns.js';
import {writeAst} from './writer.js';
import {readAst} from './reader.js';
import {runPlugin} from './runner.js';
import {
    loadSqlPlugin,
    parseSqlPlugin,
    validatePlugin,
} from './sql-plugin.js';

const isUndefined = (a) => typeof a === 'undefined';

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
    parent_field TEXT,
    start_line   INT,
    start_col    INT,
    end_line     INT,
    end_col      INT
`;

export const createDb = (connection = ':memory:') => {
    const db = new Database(connection);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    return {
        run: (query, params) => isUndefined(params) ? db
            .prepare(query)
            .run() : db
            .prepare(query)
            .run(params),
        all: (query, params) => isUndefined(params) ? db
            .prepare(query)
            .all() : db
            .prepare(query)
            .all(params),
        get: (query, params) => isUndefined(params) ? db
            .prepare(query)
            .get() : db
            .prepare(query)
            .get(params),
        exec: (query) => db.exec(query),
        transaction: (fn) => db.transaction(fn)(),
    };
};

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
            SELECT id, file, parent_id, parent_field, '${type}' AS type,
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
        
        run(file, plugins, opts = {}) {
            const places = [];
            
            for (const plugin of plugins) {
                const found = runPlugin(db, plugin, file, opts);
                
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

export {runPlugin} from './runner.js';
export {writeAst} from './writer.js';
export {readAst} from './reader.js';
export {
    loadSqlPlugin,
    parseSqlPlugin,
    validatePlugin,
} from './sql-plugin.js';
