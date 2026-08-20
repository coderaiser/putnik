import {readFileSync} from 'node:fs';
import {putout} from 'putout';
import {
    parse as parseJs,
    types,
} from '@putout/babel';
import * as processorSql from '@putout/processor-sql';
import {parse} from 'sql-parser-cst';
import {
    convertSqlToJs,
    parseSql,
    printSql,
} from 'happy-sql';
import * as pluginSql from './rules/index.js';

const {isArray} = Array;
const maybeArray = (a) => isArray(a) ? a : [a];

const {branch, merge} = processorSql;
const {
    file,
    program,
    expressionStatement,
    arrayExpression,
    isArrayExpression,
    isCallExpression,
    isIdentifier,
} = types;

const isString = (a) => typeof a === 'string';

const ALLOWED_SELECT = new Set(['select_stmt']);
const ALLOWED_REPORT = new Set(['select_stmt']);

const ALLOWED_FIX = new Set([
    'update_stmt',
    'delete_stmt',
    'insert_stmt',
]);

const parseType = (query) => parse(query.trim(), {
    dialect: 'sqlite',
    paramTypes: [':name'],
}).statements[0].type;

const isSection = (el) => el.callee.name === 'section';

export const extractSections = (sql) => {
    let ast;
    
    try {
        ast = parseSql(sql);
    } catch(error) {
        throw Error(`Cannot parse SQL:\n${sql}`, {
            cause: error,
        });
    }
    
    const plugin = {};
    const sections = ast.program.body[0].expression.elements.filter(isSection);
    
    for (const el of sections) {
        const tag = el.arguments[0].value.slice(1);
        const [, inner] = el.arguments;
        
        if (isArrayExpression(inner)) {
            plugin[tag] = [];
            
            for (const node of inner.elements) {
                const wrapped = file(program([
                    expressionStatement(arrayExpression([node])),
                ]));
                
                plugin[tag].push(printSql(wrapped).trim());
            }
            
            continue;
        }
        
        const wrapped = file(program([
            expressionStatement(arrayExpression([inner])),
        ]));
        
        plugin[tag] = printSql(wrapped).trim();
    }
    
    return plugin;
};

export const hasWhereClause = (query) => {
    const ast = parseJs(convertSqlToJs(query));
    const {elements} = ast.program.body[0].expression;
    const [node] = elements;
    
    if (!isCallExpression(node))
        return false;
    
    return node.arguments.some((arg) => isCallExpression(arg) && isIdentifier(arg.callee, {
        name: 'where',
    }));
};

export const validatePlugin = (plugin) => {
    for (const [name, query] of Object.entries(plugin)) {
        for (const currentQuery of maybeArray(query)) {
            if (!isString(currentQuery))
                continue;
            
            const type = parseType(currentQuery);
            
            if (name === 'select' && !ALLOWED_SELECT.has(type))
                throw Error(`@select must be a SELECT query, got ${type}`);
            
            if (name === 'report' && !ALLOWED_REPORT.has(type))
                throw Error(`@report must be a SELECT query, got ${type}`);
            
            if (name === 'fix' && !ALLOWED_FIX.has(type))
                throw Error(`@fix must be an UPDATE, DELETE or INSERT query, got ${type}`);
            
            const isInsert = type === 'insert_stmt';
            
            if (name === 'fix' && !isInsert && !hasWhereClause(currentQuery))
                throw Error(`@fix must have a WHERE clause`);
        }
    }
};

export const loadSqlPlugin = (filePath) => {
    const sql = readFileSync(filePath, 'utf8');
    const [{source}] = branch(sql);
    
    const {code} = putout(source, {
        plugins: [
            ['sql', pluginSql],
        ],
        isTS: true,
    });
    
    const fixedSql = merge(sql, [code]);
    const plugin = extractSections(fixedSql);
    
    validatePlugin(plugin);
    
    return plugin;
};

export const loadPlugin = loadSqlPlugin;
