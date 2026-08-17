import {readFileSync} from 'node:fs';
import {putout} from 'putout';
import {types} from '@putout/babel';
import * as processorSql from '@putout/processor-sql';
import {parse} from 'sql-parser-cst';
import {parseSqlNode, printSql} from 'happy-sql';
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

const extractSections = (sql) => {
    const ast = parseSqlNode(sql);
    const plugin = {};
    const sections = ast.program.body[0].expression.elements.filter((el) => el.callee?.name === 'section');
    
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
        } else {
            const wrapped = file(program([
                expressionStatement(arrayExpression([inner])),
            ]));
            
            plugin[tag] = printSql(wrapped).trim();
        }
    }
    
    return plugin;
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
            
            if (name === 'fix' && !isInsert && !/WHERE/i.test(currentQuery))
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
    });
    
    const fixedSql = merge(sql, [code]);
    const plugin = extractSections(fixedSql);
    
    validatePlugin(plugin);
    
    return plugin;
};
