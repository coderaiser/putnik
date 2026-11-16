import {traverse, types} from '@putout/babel';
import {getNodeId} from './writer.js';

const {
    isIdentifier,
    isAssignmentExpression,
    isUpdateExpression,
    isVariableDeclarator,
    isForXStatement,
    getAssignmentIdentifiers,
} = types;

export const createScopeTables = async (db) => {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Binding (
            id               ${db.primaryKey},
            file             TEXT NOT NULL,
            name             TEXT NOT NULL,
            kind             TEXT NOT NULL,
            scope_id         INTEGER NOT NULL,
            node_type        TEXT,
            node_id          INTEGER,
            declaration_type TEXT,
            declaration_id   INTEGER,
            constant         INTEGER NOT NULL,
            start_line       INTEGER,
            start_col        INTEGER,
            end_line         INTEGER,
            end_col          INTEGER
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Reference (
            id         ${db.primaryKey},
            file       TEXT NOT NULL,
            binding_id INTEGER NOT NULL,
            node_type  TEXT,
            node_id    INTEGER,
            is_write   INTEGER NOT NULL
        )
    `);
};

export const createScopeIndexes = async (db) => {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_Binding_file ON Binding (file)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_Reference_binding ON Reference (binding_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_Reference_file ON Reference (file)`);
};

const getWritten = (node) => {
    if (isUpdateExpression(node))
        return [node.argument];
    
    if (isAssignmentExpression(node))
        return Object.values(getAssignmentIdentifiers(node));
    
    if (isForXStatement(node))
        return Object.values(getAssignmentIdentifiers(node.left));
    
    if (isVariableDeclarator(node))
        return [node.id];
    
    return [];
};

const CHUNK = 200;

const insertMany = async (db, table, columns, rows) => {
    const placeholder = `(${columns
        .map(() => '?')
        .join(', ')})`;
    
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        
        await db.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${chunk
            .map(() => placeholder)
            .join(', ')}`, chunk.flat());
    }
};

const BINDING_COLUMNS = [
    'id',
    'file',
    'name',
    'kind',
    'scope_id',
    'node_type',
    'node_id',
    'declaration_type',
    'declaration_id',
    'constant',
    'start_line',
    'start_col',
    'end_line',
    'end_col',
];

const REFERENCE_COLUMNS = [
    'file',
    'binding_id',
    'node_type',
    'node_id',
    'is_write',
];

const createReference = (file, bindingId, node, isWrite) => {
    const {type, id} = getNodeId(node);
    
    return [
        file,
        bindingId,
        type,
        id,
        isWrite,
    ];
};

export const writeScope = async (db, ast, file) => {
    const scopes = new Set();
    
    traverse(ast, {
        Scopable(path) {
            scopes.add(path.scope);
        },
    });
    
    const {last} = await db.get(`SELECT COALESCE(MAX(id), 0) AS last FROM Binding`);
    const bindingRows = [];
    const referenceRows = [];
    let bindingId = last;
    
    for (const scope of scopes) {
        for (const binding of Object.values(scope.bindings)) {
            const {identifier} = binding;
            const {start, end} = identifier.loc;
            const id = getNodeId(identifier);
            const declaration = getNodeId(binding.path.node);
            
            ++bindingId;
            
            bindingRows.push([
                bindingId,
                file,
                identifier.name,
                binding.kind,
                scope.uid,
                id.type,
                id.id,
                declaration.type,
                declaration.id,
                Number(binding.constant),
                start.line,
                start.column,
                end.line,
                end.column,
            ]);
            
            for (const referencePath of binding.referencePaths)
                referenceRows.push(createReference(file, bindingId, referencePath.node, 0));
            
            for (const violation of binding.constantViolations)
                for (const node of getWritten(violation.node))
                    if (isIdentifier(node, {name: identifier.name}))
                        referenceRows.push(createReference(file, bindingId, node, 1));
        }
    }
    
    await insertMany(db, 'Binding', BINDING_COLUMNS, bindingRows);
    await insertMany(db, 'Reference', REFERENCE_COLUMNS, referenceRows);
};
