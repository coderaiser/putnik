import {convertSqlToJs, convertJsToSql} from 'happy-sql';
import {putout} from 'putout';
import {createDebug} from 'obug';
import * as convertPostgresToSqlite from '@putout/plugin-sql/convert-postgres-to-sqlite';

const log = createDebug('putnik:runner');

const {isArray} = Array;
const maybeArray = (a) => isArray(a) ? a : [a];

const SQLITE_DIALECTS = new Set([
    'sqlite',
    'turso',
]);

const toSqliteDialect = (stmt) => {
    const {code} = putout(convertSqlToJs(stmt), {
        plugins: [
            ['convert-postgresql-to-sqlite', convertPostgresToSqlite],
        ],
    });
    
    return convertJsToSql(code);
};

const getFixStmts = (db, plugin) => {
    const stmts = maybeArray(plugin.fix);
    
    if (SQLITE_DIALECTS.has(db.dialect))
        return stmts.map(toSqliteDialect);
    
    return stmts;
};

const RETURNING_ID_AS = /\s+RETURNING\s+id\s+AS\s+(\w+)\s*$/i;

export const runPlugin = async (db, plugin, file, {fix = false} = {}) => {
    const {select} = plugin;
    
    log(`query: ${select}`);
    const rows = await db.all(select, {
        file,
    });
    
    if (!rows.length)
        return [];
    
    if (fix) {
        const fixStmts = getFixStmts(db, plugin);
        
        await db.transaction(async () => {
            for (const row of rows) {
                const params = {
                    ...row,
                    file,
                };
                
                for (const stmt of fixStmts) {
                    const match = RETURNING_ID_AS.exec(stmt);
                    
                    if (match) {
                        const [, name] = match;
                        const query = stmt.slice(0, match.index);
                        
                        params[name] = await db.insert(query, params);
                    } else {
                        await db.run(stmt, params);
                    }
                }
            }
        });
    }
    
    const rowParams = {};
    
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!(key in rowParams))
                rowParams[key] = row[key];
        }
    }
    
    const places = await db.all(plugin.report, {
        ...rowParams,
        file,
    });
    
    return places.map((place) => ({
        message: place.message,
        position: {
            line: place.line || rowParams.start_line,
            column: place.col || rowParams.start_col,
        },
    }));
};
