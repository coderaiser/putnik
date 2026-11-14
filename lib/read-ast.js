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
        
        for (const word of words)
            array.push(getFirst(word));
    }
    
    return new Set(array);
};

const NODE_FIELDS = {
    Program: {
        boolean: [],
    },
    BlockStatement: {
        boolean: [],
    },
    SwitchCase: {
        boolean: [],
    },
    ClassBody: {
        boolean: [],
    },
    TemplateLiteral: {
        boolean: [],
    },
    ArrayExpression: {
        boolean: [],
    },
    ObjectExpression: {
        boolean: [],
    },
    CallExpression: {
        boolean: [],
    },
    NewExpression: {
        boolean: [],
    },
    
    SequenceExpression: {
        boolean: [],
    },
    VariableDeclaration: {
        boolean: [],
    },
    FunctionDeclaration: {
        boolean: ['async', 'generator'],
    },
    FunctionExpression: {
        boolean: ['async', 'generator'],
    },
    ArrowFunctionExpression: {
        boolean: ['async'],
    },
    ClassDeclaration: {
        boolean: [],
    },
    ClassExpression: {
        boolean: [],
    },
    ClassMethod: {
        boolean: [
            'async',
            'generator',
            'static',
            'computed',
        ],
    },
    ClassPrivateMethod: {
        boolean: [
            'async',
            'generator',
            'static',
            'computed',
        ],
    },
    ObjectMethod: {
        boolean: ['async', 'generator', 'computed'],
    },
    ObjectProperty: {
        boolean: ['computed', 'method', 'shorthand'],
    },
    ClassProperty: {
        boolean: ['static', 'computed'],
    },
    ClassPrivateProperty: {
        boolean: ['static'],
    },
    MemberExpression: {
        boolean: ['computed'],
    },
    OptionalMemberExpression: {
        boolean: ['computed', 'optional'],
    },
    OptionalCallExpression: {
        boolean: ['optional'],
    },
    UnaryExpression: {
        boolean: ['prefix'],
    },
    UpdateExpression: {
        boolean: ['prefix'],
    },
    YieldExpression: {
        boolean: ['delegate'],
    },
    ForOfStatement: {
        boolean: ['await'],
    },
    JSXOpeningElement: {
        boolean: ['selfClosing'],
    },
    TemplateElement: {
        boolean: ['tail'],
    },
    BooleanLiteral: {
        boolean: ['value'],
    },
    ImportDeclaration: {
        boolean: [],
    },
    ExportNamedDeclaration: {
        boolean: [],
    },
    TSEnumDeclaration: {
        boolean: [],
    },
};

const isArrayValidator = (validate) => validate?.each || validate?.chainOf?.some(isArrayValidator) || validate?.type === 'array';

const ARRAY_FIELD_SETS = {};
const REQUIRED_ARRAY_FIELDS = {};
const BOOLEAN_FIELD_SETS = {};

for (const nodeType in t.VISITOR_KEYS) {
    const fields = t.VISITOR_KEYS[nodeType].filter((field) => isArrayValidator(t.NODE_FIELDS[nodeType][field].validate));
    
    if (!fields.length)
        continue;
    
    ARRAY_FIELD_SETS[nodeType] = new Set(fields);
    REQUIRED_ARRAY_FIELDS[nodeType] = fields.filter((field) => !t.NODE_FIELDS[nodeType][field].optional);
}

for (const nodeType in NODE_FIELDS)
    BOOLEAN_FIELD_SETS[nodeType] = new Set(NODE_FIELDS[nodeType].boolean);

// columns that are not Babel builder keys but are needed to restore the node
const EXTRA_SCALARS = {
    ArrayExpression: ['holes'],
    ArrayPattern: ['holes'],
    TemplateElement: ['raw', 'cooked'],
    BigIntLiteral: ['raw'],
    ClassPrivateMethod: ['computed', 'generator', 'async'],
    StringLiteral: ['raw'],
    NumericLiteral: ['raw'],
    RegExpLiteral: ['raw'],
    DirectiveLiteral: ['raw'],
};

const insertHoles = (node) => {
    const holes = JSON.parse(node.holes);
    
    delete node.holes;
    
    for (const index of holes)
        node.elements.splice(index, 0, null);
};

// restore shape of the node after all of its children are built
const FINALIZE = {
    ArrayExpression: (node) => node.holes && insertHoles(node),
    ArrayPattern: (node) => node.holes && insertHoles(node),
    BigIntLiteral: (node) => {
        node.value = BigInt(node.value);
    },
    TemplateElement: (node) => {
        node.value = {
            raw: node.raw || '',
            cooked: node.cooked || '',
        };
        delete node.raw;
        delete node.cooked;
    },
};

const TYPE_META = {};

for (const nodeType in t.VISITOR_KEYS) {
    if (!NODE_COLUMNS[nodeType])
        continue;
    
    const dbColumnSet = parseColumnNames(NODE_COLUMNS[nodeType]);
    const visitorFields = new Set(t.VISITOR_KEYS[nodeType]);
    const builderKeys = t.BUILDER_KEYS[nodeType];
    
    const scalars = [...EXTRA_SCALARS[nodeType] || []];
    
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
        join: `LEFT JOIN "${nodeType}" ON "${nodeType}".id = n.id`,
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

const DEFAULTS = {
    Program: {
        sourceType: 'module',
    },
};

// 0 and '' are valid values, only NULL means there is no value
const readValue = (value, defaultValue) => value === null ? defaultValue : value;

const readNode = (nodeType, row) => {
    const meta = TYPE_META[nodeType];
    const defaults = DEFAULTS[nodeType];
    
    if (!meta)
        return {};
    
    const result = {};
    
    for (const {field, alias, isBoolean} of meta.scalars)
        result[field] = isBoolean ? Boolean(row[alias]) : readValue(row[alias], defaults?.[field]);
    
    return result;
};

const getType = (a) => a.type;

const addExists = (type) => `SELECT '${type}' AS type WHERE EXISTS(SELECT 1 FROM "${type}" WHERE file = ?)`;

export const readAst = async (db, file) => {
    const typeDiscoveryQuery = Object
        .keys(NODE_COLUMNS)
        .map(addExists)
        .join('\nUNION ALL\n');
    
    const typeRows = await db.all(
        typeDiscoveryQuery,
        Object
            .keys(NODE_COLUMNS)
            .map(() => file),
    );
    
    if (!typeRows.length)
        return null;
    
    const typesInFile = new Set(typeRows.map(getType));
    
    // Collect all scalar aliases that appear across any type present in this file
    const allAliases = [];
    
    for (const nodeType of typesInFile) {
        const meta = TYPE_META[nodeType];
        
        if (!meta)
            continue;
        
        for (const {alias} of meta.scalars) {
            if (!allAliases.includes(alias))
                allAliases.push(alias);
        }
    }
    
    const branches = [];
    
    for (const nodeType of typesInFile) {
        const meta = TYPE_META[nodeType];
        const myAliasToFragment = new Map();
        
        if (meta)
            for (const fragment of meta.selectFragments) {
                const [, alias] = fragment.split(' AS ');
                myAliasToFragment.set(alias, fragment);
            }
        
        const extraCols = [];
        
        for (const alias of allAliases) {
            extraCols.push(myAliasToFragment.has(alias) ? myAliasToFragment.get(alias) : `NULL AS ${alias}`);
        }
        
        const selectParts = [
            'n.id',
            `'${nodeType}' AS type`,
            'n.parent_id',
            'n.parent_type',
            'n.parent_field',
            'n.start_line',
            'n.start_col',
            'n.end_line',
            'n.end_col',
            ...extraCols,
        ];
        
        const joinParts = meta ? [meta.join] : [];
        
        branches.push(`SELECT ${selectParts.join(',\n            ')}
        FROM "${nodeType}" n
        ${joinParts.join('\n        ')}
        WHERE n.file = ?`);
    }
    
    const query = branches.join('\n        UNION ALL\n        ') +
        `
        ORDER BY start_line, start_col`;
    
    const rows = await db.all(query, [...typesInFile].map(() => file));
    
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
    
    const nodeMap = new Map();
    
    const build = (row) => {
        const arrayFieldSet = ARRAY_FIELD_SETS[row.type];
        
        const node = {
            type: row.type,
            ...readNode(row.type, row),
            loc: {
                start: {
                    line: row.start_line,
                    column: row.start_col,
                },
                end: {
                    line: row.end_line,
                    column: row.end_col,
                },
            },
        };
        
        nodeMap.set(`${row.type}:${row.id}`, node);
        
        const byField = new Map();
        
        for (const field of REQUIRED_ARRAY_FIELDS[row.type] || [])
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
        
        FINALIZE[row.type]?.(node);
        
        return node;
    };
    
    const rootNode = {
        type: 'File',
        program: build(root),
    };
    
    await readComments(db, file, nodeMap);
    await readExtra(db, file, nodeMap);
    
    return rootNode;
};

export const readExtra = async (db, file, nodeMap) => {
    const rows = await db.all(`SELECT node_id, node_type FROM Extra WHERE file = ? AND parenthesized = 1`, [file]);
    
    for (const {node_id, node_type} of rows) {
        const node = nodeMap.get(`${node_type}:${node_id}`);
        
        if (node)
            node.extra = {
                ...node.extra,
                parenthesized: true,
            };
    }
};

export const readComments = async (db, file, nodeMap) => {
    const rows = await db.all(`SELECT * FROM Comments WHERE file = ? ORDER BY start_line, start_col, node_id`, [file]);
    
    for (const row of rows) {
        const node = nodeMap.get(`${row.node_type}:${row.node_id}`);
        
        if (!node)
            continue;
        
        const comment = {
            type: row.type,
            value: row.value,
            loc: {
                start: {
                    line: row.start_line,
                    column: row.start_col,
                },
                end: {
                    line: row.end_line,
                    column: row.end_col,
                },
            },
        };
        
        if (row.inner) {
            if (!node.innerComments)
                node.innerComments = [];
            
            node.innerComments.push(comment);
            continue;
        }
        
        // same comment can be attached as trailing on one node
        // and leading on another, each owner has its own row
        if (row.trailing) {
            if (!node.trailingComments)
                node.trailingComments = [];
            
            node.trailingComments.push(comment);
            continue;
        }
        
        if (row.leading) {
            if (!node.leadingComments)
                node.leadingComments = [];
            
            node.leadingComments.push(comment);
        }
    }
};
