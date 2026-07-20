import {readFileSync} from 'node:fs';
import nodeSqlParser from 'node-sql-parser';

const isString = (a) => typeof a === 'string';
const {Parser} = nodeSqlParser;
const parser = new Parser();

const ALLOWED_SELECT = new Set(['select']);
const ALLOWED_REPORT = new Set(['select']);
const ALLOWED_FIX = new Set(['update']);

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
        
        const result = parser.parse(query);
        const ast = Array.isArray(result.ast) ? result.ast[0] : result.ast;
        const astType = ast.type;
        
        if (name === 'select' && !ALLOWED_SELECT.has(astType))
            throw Error(`@select must be a SELECT query, got ${astType.toUpperCase()}`);
        
        if (name === 'report' && !ALLOWED_REPORT.has(astType))
            throw Error(`@report must be a SELECT query, got ${astType.toUpperCase()}`);
        
        if (name === 'fix' && !ALLOWED_FIX.has(astType))
            throw Error(`@fix must be an UPDATE or DELETE query, got ${astType.toUpperCase()}`);
    }
};

export const loadSqlPlugin = (filePath) => {
    const raw = readFileSync(filePath, 'utf8');
    const plugin = parseSqlPlugin(raw);
    
    validatePlugin(plugin);
    
    return plugin;
};
