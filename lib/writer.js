import {montag} from 'montag';
import {NODE_COLUMNS} from './node-columns.js';
import {nextId} from './next-id.js';

const isUndefined = (a) => typeof a === 'undefined';

const {entries} = Object;
const returns = (a) => () => a;

const SKIP = new Set([
    'type',
    'start',
    'end',
    'loc',
    'extra',
    'leadingComments',
    'trailingComments',
    'innerComments',
]);

const writeNode = (db, node, file, parentId, parentField) => {
    if (!node || typeof node !== 'object' || !node.type)
        return null;
    
    const {type, loc} = node;
    const extra = {};
    
    if (type === 'Identifier')
        extra.name = node.name;
    
    if (type === 'StringLiteral')
        extra.value = node.value;
    
    if (type === 'NumericLiteral')
        extra.value = node.value;
    
    if (type === 'VariableDeclaration')
        extra.kind = node.kind;
    
    if (type === 'Program')
        extra.source_type = node.sourceType;
    
    const id = insertNode(db, type, file, parentId, parentField, loc, extra);
    
    if (id === null)
        return null;
    
    for (const [key, val] of entries(node)) {
        if (SKIP.has(key))
            continue;
        
        if (Array.isArray(val)) {
            for (const child of val)
                writeNode(db, child, file, id, key);
            
            continue;
        }
        
        if (val && typeof val === 'object' && val.type)
            writeNode(db, val, file, id, key);
    }
    
    return id;
};

export const writeAst = (db, ast, file) => writeNode(db, ast.program, file, null, null);

export const insertNode = (db, type, file, parentId, parentField, loc, extra) => {
    if (isUndefined(NODE_COLUMNS[type]))
        return null;
    
    const id = nextId();
    
    const {start, end} = loc;
    const startLine = start.line;
    const startCol = start.column;
    const endLine = end.line;
    const endCol = end.column;
    
    const extraKeys = Object.keys(extra);
    const extraCols = extraKeys.length ? `, ${extraKeys.join(', ')}` : '';
    
    const mapped = extraKeys
        .map(returns('?'))
        .join(', ');
    
    const extraVals = !extraKeys.length ? '' : `, ${mapped}`;
    const extraData = [];
    
    for (const key of extraKeys) {
        extraData.push(extra[key]);
    }
    
    db.run(montag`
        INSERT INTO "${type}"
            (id, file, parent_id, parent_field, start_line, start_col, end_line, end_col ${extraCols})
            VALUES (?, ?, ?, ?, ?, ?, ?, ? ${extraVals})
     `, [
        id,
        file,
        parentId,
        parentField,
        startLine,
        startCol,
        endLine,
        endCol,
        ...extraData,
    ]);
    
    return id;
};
