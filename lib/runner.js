import {convertSqlToJs, convertJsToSql} from 'happy-sql';
import {putout} from 'putout';
import {
    parse,
    generate,
    types,
} from '@putout/babel';
import {createDebug} from 'obug';
import * as convertPostgresToSqlite from '@putout/plugin-sql/convert-postgres-to-sqlite';
import {tryToCatch} from 'try-to-catch';

const log = createDebug('putnik:runner');

const {isArray} = Array;
const maybeArray = (a) => isArray(a) ? a : [a];

const {
    isCallExpression,
    isIdentifier,
    isTSAsExpression,
} = types;

const SQLITE_DIALECTS = new Set([
    'sqlite',
    'turso',
]);

const toSqliteDialect = (stmt) => {
    const {code} = putout(convertSqlToJs(stmt), {
        plugins: [
            ['convert-postgresql-to-sqlite', convertPostgresToSqlite],
        ],
        isTS: true,
    });
    
    return convertJsToSql(code);
};

const getFixStmts = (db, plugin) => {
    const stmts = maybeArray(plugin.fix);
    
    if (SQLITE_DIALECTS.has(db.dialect))
        return stmts.map(toSqliteDialect);
    
    return stmts;
};

const getStatementAst = (stmt) => parse(convertSqlToJs(stmt), {
    sourceType: 'module',
    plugins: [
        ['typescript'],
    ],
});

const extractReturning = (stmt) => {
    const ast = getStatementAst(stmt);
    const [node] = ast.program.body[0].expression.elements;
    
    if (!isCallExpression(node) || !isIdentifier(node.callee, {name: 'insert'}))
        return {
            alias: null,
            query: stmt,
        };
    
    const args = node.arguments;
    const last = args.at(-1);
    
    if (!isCallExpression(last) || !isIdentifier(last.callee, {name: 'returning'}))
        return {
            alias: null,
            query: stmt,
        };
    
    const [returningArg] = last.arguments;
    
    if (!isTSAsExpression(returningArg))
        return {
            alias: null,
            query: stmt,
        };
    
    const alias = returningArg.typeAnnotation.literal.value;
    
    node.arguments = args.slice(0, -1);
    
    const query = convertJsToSql(generate(ast).code).trim();
    
    return {
        alias,
        query,
    };
};

export const runPlugin = async (db, plugin, file, {fix = false} = {}) => {
    const {select} = plugin;
    
    log(`query: ${select}`);
    const [error, rows] = await tryToCatch(db.all.bind(db, select, {
        file,
    }));
    
    if (error)
        throw Error(`${error.message}: '${select}'`, {
            cause: error,
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
                    const {alias, query} = extractReturning(stmt);
                    
                    if (alias)
                        params[alias] = await db.insert(query, params);
                    else
                        await db.run(query, params);
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
