import {montag} from 'montag';

const ARRAY_FIELDS = new Set([
    'body',
    'declarations',
    'elements',
    'properties',
    'params',
    'arguments',
]);

export const readAst = (db, file) => {
    const rows = db.all(montag`
        SELECT
            n.id, n.type, n.parent_id, n.parent_field,
            n.start_line, n.start_col, n.end_line, n.end_col,
            i.name         AS identifier_name,
            sl.value       AS string_value,
            nl.value       AS numeric_value,
            vd.kind        AS declaration_kind,
            p.source_type  AS program_source_type
        FROM file_nodes n
        LEFT JOIN Identifier          i  ON i.id  = n.id AND n.type = 'Identifier'
        LEFT JOIN StringLiteral       sl ON sl.id = n.id AND n.type = 'StringLiteral'
        LEFT JOIN NumericLiteral      nl ON nl.id = n.id AND n.type = 'NumericLiteral'
        LEFT JOIN VariableDeclaration vd ON vd.id = n.id AND n.type = 'VariableDeclaration'
        LEFT JOIN Program             p  ON p.id  = n.id AND n.type = 'Program'
        WHERE n.file = ?
    `, [file]);
    
    if (!rows.length)
        return null;
    
    const index = new Map();
    
    for (const row of rows)
        index.set(row.id, {
            ...row,
            _children: [],
        });
    
    let root = null;
    
    for (const row of rows) {
        if (row.parent_id === null) {
            root = index.get(row.id);
            continue;
        }
        
        const parent = index.get(row.parent_id);
        
        if (parent)
            parent._children.push(row);
    }
    
    if (!root)
        return null;
    
    const build = (row) => {
        const entry = index.get(row.id);
        const node = {
            type: row.type,
        };
        
        if (row.type === 'Identifier')
            node.name = entry.identifier_name;
        
        if (row.type === 'StringLiteral')
            node.value = entry.string_value;
        
        if (row.type === 'NumericLiteral')
            node.value = Number(entry.numeric_value);
        
        if (row.type === 'VariableDeclaration')
            node.kind = entry.declaration_kind;
        
        if (row.type === 'Program')
            node.sourceType = entry.program_source_type || 'module';
        
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
