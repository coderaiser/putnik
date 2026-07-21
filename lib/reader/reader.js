import {readRows} from './read-rows.js';
import {READERS} from './readers.js';

const ARRAY_FIELDS = new Set([
    'body',
    'declarations',
    'elements',
    'properties',
    'params',
    'arguments',
    'specifiers',
    'members',
    'expressions',
    'decorators',
    'directives',
]);

export const readAst = (db, file) => {
    const rows = readRows(db, file);
    
    if (!rows.length)
        return null;
    
    const nodeKey = (type, id) => `${type}:${id}`;
    const index = new Map();
    
    for (const row of rows)
        index.set(nodeKey(row.type, row.id), {
            ...row,
            _children: [],
        });
    
    let root = null;
    
    for (const row of rows) {
        if (row.parent_id === null) {
            root = index.get(nodeKey(row.type, row.id));
            continue;
        }
        
        const parent = index.get(nodeKey(row.parent_type, row.parent_id));
        
        if (parent)
            parent._children.push(row);
    }
    
    if (!root)
        return null;
    
    const build = (row) => {
        const entry = index.get(nodeKey(row.type, row.id));
        const read = READERS[row.type];
        
        const node = {
            type: row.type,
            ...read && read(entry),
        };
        
        const byField = new Map();
        
        for (const child of entry._children) {
            const {parent_field} = child;
            
            if (!byField.has(parent_field))
                byField.set(parent_field, []);
            
            byField.get(parent_field).push(child);
        }
        
        for (const [field, children] of byField) {
            const built = children.map(build);
            node[field] = ARRAY_FIELDS.has(field) ? built : built[0];
        }
        
        return node;
    };
    
    return {
        type: 'File',
        program: build(root),
    };
};
