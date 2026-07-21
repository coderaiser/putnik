import * as t from '@babel/types';
import toSnake from 'just-snake-case';
import {NODE_COLUMNS} from './node-columns.js';

const getFirst = (a) => a
    .trim()
    .split(' ')
    .at(0);

const parseColumnNames = (str) => {
    const array = [];
    
    if (str) {
        const words = str.split(',');
        array.push(...words.map(getFirst));
    }
    
    return new Set(array);
};

const NODE_FIELDS = {
    Program: {
        array: ['body', 'directives'],
        boolean: [],
    },
    BlockStatement: {
        array: ['body', 'directives'],
        boolean: [],
    },
    SwitchCase: {
        array: ['consequent'],
        boolean: [],
    },
    ClassBody: {
        array: ['body'],
        boolean: [],
    },
    TemplateLiteral: {
        array: ['quasis', 'expressions'],
        boolean: [],
    },
    ArrayExpression: {
        array: ['elements'],
        boolean: [],
    },
    ObjectExpression: {
        array: ['properties'],
        boolean: [],
    },
    CallExpression: {
        array: ['arguments'],
        boolean: [],
    },
    NewExpression: {
        array: ['arguments'],
        boolean: [],
    },
    OptionalCallExpression: {
        array: ['arguments'],
        boolean: [],
    },
    SequenceExpression: {
        array: ['expressions'],
        boolean: [],
    },
    VariableDeclaration: {
        array: ['declarations'],
        boolean: [],
    },
    FunctionDeclaration: {
        array: ['params', 'decorators'],
        boolean: ['async', 'generator'],
    },
    FunctionExpression: {
        array: ['params'],
        boolean: ['async', 'generator'],
    },
    ArrowFunctionExpression: {
        array: ['params'],
        boolean: ['async'],
    },
    ClassDeclaration: {
        array: ['decorators'],
        boolean: [],
    },
    ClassExpression: {
        array: ['decorators'],
        boolean: [],
    },
    ClassMethod: {
        array: ['params', 'decorators'],
        boolean: [
            'async',
            'generator',
            'static',
            'computed',
        ],
    },
    ClassPrivateMethod: {
        array: ['params', 'decorators'],
        boolean: ['async', 'generator', 'static'],
    },
    ObjectMethod: {
        array: ['params'],
        boolean: ['async', 'generator', 'computed'],
    },
    ObjectProperty: {
        array: [],
        boolean: ['computed', 'method', 'shorthand'],
    },
    ClassProperty: {
        array: [],
        boolean: ['static', 'computed'],
    },
    ClassPrivateProperty: {
        array: [],
        boolean: ['static'],
    },
    MemberExpression: {
        array: [],
        boolean: ['computed'],
    },
    OptionalMemberExpression: {
        array: [],
        boolean: ['computed'],
    },
    UnaryExpression: {
        array: [],
        boolean: ['prefix'],
    },
    UpdateExpression: {
        array: [],
        boolean: ['prefix'],
    },
    YieldExpression: {
        array: [],
        boolean: ['delegate'],
    },
    ForOfStatement: {
        array: [],
        boolean: ['await'],
    },
    JSXOpeningElement: {
        array: [],
        boolean: ['selfClosing'],
    },
    TemplateElement: {
        array: [],
        boolean: ['tail'],
    },
    ImportDeclaration: {
        array: ['specifiers'],
        boolean: [],
    },
    ExportNamedDeclaration: {
        array: ['specifiers'],
        boolean: [],
    },
    TSEnumDeclaration: {
        array: ['members'],
        boolean: [],
    },
};

const ARRAY_FIELD_SETS = {};
const BOOLEAN_FIELD_SETS = {};

for (const nodeType in NODE_FIELDS) {
    ARRAY_FIELD_SETS[nodeType] = new Set(NODE_FIELDS[nodeType].array);
    BOOLEAN_FIELD_SETS[nodeType] = new Set(NODE_FIELDS[nodeType].boolean);
}

const TYPE_META = {};

for (const nodeType in t.VISITOR_KEYS) {
    if (!NODE_COLUMNS[nodeType])
        continue;
    
    const dbColumnSet = parseColumnNames(NODE_COLUMNS[nodeType]);
    const visitorFields = new Set(t.VISITOR_KEYS[nodeType]);
    const builderKeys = t.BUILDER_KEYS[nodeType];
    
    const scalars = [];
    
    for (const field of builderKeys) {
        if (visitorFields.has(field))
            continue;
        
        const colName = toSnake(field);
        
        if (dbColumnSet.has(colName))
            scalars.push(field);
    }
    
    if (!scalars.length)
        continue;
    
    const tablePrefix = toSnake(nodeType);
    const booleanSet = BOOLEAN_FIELD_SETS[nodeType];
    
    const meta = {
        scalars: [],
        selectFragments: [],
        join: `LEFT JOIN "${nodeType}" ON "${nodeType}".id = n.id AND n.type = '${nodeType}'`,
    };
    
    for (const field of scalars) {
        const col = toSnake(field);
        const alias = `${tablePrefix}_${col}`;
        const isBoolean = booleanSet?.has(field);
        
        meta.scalars.push({
            field,
            alias,
            isBoolean,
        });
        meta.selectFragments.push(`"${nodeType}"."${col}" AS ${alias}`);
    }
    
    TYPE_META[nodeType] = meta;
}

const selectLines = [];
const joinLines = [];

for (const nodeType in TYPE_META) {
    for (const frag of TYPE_META[nodeType].selectFragments)
        selectLines.push(frag);
    
    joinLines.push(TYPE_META[nodeType].join);
}

const ALL_SELECTS = selectLines.join(',\n            ');
const ALL_JOINS = joinLines.join('\n        ');

const DEFAULTS = {
    Program: {
        sourceType: 'module',
    },
};

const readNode = (nodeType, row) => {
    const meta = TYPE_META[nodeType];
    const defaults = DEFAULTS[nodeType];
    
    if (!meta)
        return {};
    
    const result = {};
    
    for (const {field, alias, isBoolean} of meta.scalars)
        result[field] = isBoolean ? Boolean(row[alias]) : row[alias] ?? defaults?.[field];
    
    return result;
};

export const readAst = (db, file) => {
    const rows = db.all(`
        SELECT
            n.id, n.type, n.parent_id, n.parent_type, n.parent_field,
            n.start_line, n.start_col, n.end_line, n.end_col,
            ${ALL_SELECTS}
        FROM file_nodes n
        ${ALL_JOINS}
        WHERE n.file = ?
        ORDER BY n.start_line, n.start_col
    `, [file]);
    
    if (!rows.length)
        return null;
    
    const children = new Map();
    
    for (const row of rows)
        children.set(`${row.type}:${row.id}`, []);
    
    let root = null;
    
    for (const row of rows) {
        if (!row.parent_id) {
            root = row;
            continue;
        }
        
        const parentChildren = children.get(`${row.parent_type}:${row.parent_id}`);
        
        if (parentChildren)
            parentChildren.push(row);
    }
    
    if (!root)
        return null;
    
    const build = (row) => {
        const arrayFieldSet = ARRAY_FIELD_SETS[row.type];
        
        const node = {
            type: row.type,
            ...readNode(row.type, row),
        };
        
        const byField = new Map();
        
        if (arrayFieldSet)
            for (const field of arrayFieldSet)
                node[field] = [];
        
        const childList = children.get(`${row.type}:${row.id}`);
        
        for (const child of childList) {
            if (!byField.has(child.parent_field))
                byField.set(child.parent_field, []);
            
            byField.get(child.parent_field).push(child);
        }
        
        for (const [field, fieldChildren] of byField) {
            const built = [];
            
            for (const child of fieldChildren)
                built.push(build(child));
            
            node[field] = arrayFieldSet?.has(field) ? built : built[0];
        }
        
        return node;
    };
    
    return {
        type: 'File',
        program: build(root),
    };
};
