import {readFileSync} from 'node:fs';
import {putout} from 'putout';
import {
    generate,
    parse,
    types,
} from '@putout/babel';
import {convertJsToSql} from 'happy-sql';
import * as pluginSql from './rules/index.js';
import * as wrapExportsInSection from './rules/wrap-exports-in-section/index.js';
import {
    extractSections,
    validatePlugin,
} from './sql-plugin.js';

const {isIdentifier} = types;

const SECTION_EXPORTS = [
    'detector',
    'report',
    'fix',
];

export const getExportReturn = (ast, name) => {
    const {body} = ast.program;
    
    for (const statement of body) {
        if (statement.type !== 'ExportNamedDeclaration')
            continue;
        
        const {declaration} = statement;
        
        if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const')
            continue;
        
        const [declarator] = declaration.declarations;
        
        if (!declarator?.id || !isIdentifier(declarator.id) || declarator.id.name !== name)
            continue;
        
        const {init} = declarator;
        
        if (init?.type !== 'ArrowFunctionExpression')
            continue;
        
        return init.body;
    }
    
    throw Error(`Detector plugin must export "${name}"`);
};

export const loadDetectorPlugin = (filePath) => {
    const source = readFileSync(filePath, 'utf8');
    
    const {code} = putout(source, {
        plugins: [
            ['sql', pluginSql],
            ['wrap-exports-in-section', wrapExportsInSection],
        ],
    });
    
    const ast = parse(code, {
        sourceType: 'module',
    });
    
    const sections = [];
    
    for (const name of SECTION_EXPORTS) {
        sections.push(convertJsToSql(generate(getExportReturn(ast, name)).code));
    }
    
    const sql = sections.join('\n');
    const plugin = extractSections(sql);
    
    validatePlugin(plugin);
    
    return plugin;
};
