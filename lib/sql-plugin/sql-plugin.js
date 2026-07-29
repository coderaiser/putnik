import {readFileSync} from 'node:fs';
import {putout} from 'putout';
import * as processorSql from '@putout/processor-sql';
import {parse} from 'sql-parser-cst';
import * as pluginSql from './rules/index.js';

const {branch, merge} = processorSql;

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

export const parseSqlPlugin = (raw) => {
    const sections = raw.split(/(?=^--\s*@(?:select|report|fix)\b)/m);
    const plugin = {};
    
    for (const section of sections) {
        const trimmed = section.trim();
        
        if (!trimmed)
            continue;
        
        const tagMatch = trimmed.match(/^--\s*@(select|report|fix)\b/);
        
        if (!tagMatch)
            continue;
        
        const [, tag] = tagMatch;
        
        plugin[tag] = trimmed
            .slice(tagMatch[0].length)
            .trim();
    }
    
    return plugin;
};

export const validatePlugin = (plugin) => {
    for (const [name, query] of Object.entries(plugin)) {
        if (!isString(query))
            continue;
        
        const type = parseType(query);
        
        if (name === 'select' && !ALLOWED_SELECT.has(type))
            throw Error(`@select must be a SELECT query, got ${type}`);
        
        if (name === 'report' && !ALLOWED_REPORT.has(type))
            throw Error(`@report must be a SELECT query, got ${type}`);
        
        if (name === 'fix' && !ALLOWED_FIX.has(type))
            throw Error(`@fix must be an UPDATE, DELETE or INSERT query, got ${type}`);
        
        const isInsert = type === 'insert_stmt';
        
        if (name === 'fix' && !isInsert && !/WHERE/i.test(query))
            throw Error(`@fix must have a WHERE clause`);
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
    
    const plugin = parseSqlPlugin(fixedSql);
    
    validatePlugin(plugin);
    
    return plugin;
};
