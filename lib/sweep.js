import {NODE_COLUMNS} from './node-columns.js';

const NODE_TYPES = new Set(Object.keys(NODE_COLUMNS));
const isNodeType = (type) => NODE_TYPES.has(type);

// tables with a link to a node: `node_type` and `node_id`
const OWNED = [
    'Comments',
    'Extra',
    'Binding',
    'Reference',
];

const deleteRows = async (db, query, params) => {
    const rows = await db.all(`${query} RETURNING id`, params);
    
    return rows.length;
};

const findPairs = async (db, file) => {
    const pairs = await db.all(`
        SELECT DISTINCT type, parent_type
        FROM nodes
        WHERE file = :file
            AND parent_type IS NOT NULL
    `, {
        file,
    });
    
    return pairs.filter(({parent_type}) => isNodeType(parent_type));
};

const sweepNodes = async (db, file, pairs) => {
    let deleted = 0;
    
    for (const {type, parent_type} of pairs) {
        deleted += await deleteRows(db, `
            DELETE FROM ${type}
            WHERE file = :file
                AND parent_type = '${parent_type}'
                AND NOT EXISTS (
                    SELECT 1 FROM ${parent_type} AS parent
                    WHERE parent.id = ${type}.parent_id
                )
        `, {
            file,
        });
    }
    
    return deleted;
};

const sweepOwned = async (db, table, file) => {
    const rows = await db.all(`
        SELECT DISTINCT node_type
        FROM ${table}
        WHERE file = :file
            AND node_type IS NOT NULL
    `, {
        file,
    });
    
    for (const {node_type} of rows) {
        if (!isNodeType(node_type))
            continue;
        
        await deleteRows(db, `
            DELETE FROM ${table}
            WHERE file = :file
                AND node_type = '${node_type}'
                AND NOT EXISTS (
                    SELECT 1 FROM ${node_type} AS node
                    WHERE node.id = ${table}.node_id
                )
        `, {
            file,
        });
    }
};

const sweepReferences = async (db, file) => {
    await deleteRows(db, `
        DELETE FROM Reference
        WHERE file = :file
            AND NOT EXISTS (
                SELECT 1 FROM Binding AS binding
                WHERE binding.id = Reference.binding_id
            )
    `, {
        file,
    });
};

const sweepFile = async (db, file) => {
    const pairs = await findPairs(db, file);
    let deleted = 0;
    
    do {
        deleted = await sweepNodes(db, file, pairs);
    } while (deleted);
    
    for (const table of OWNED)
        await sweepOwned(db, table, file);
    
    await sweepReferences(db, file);
};

// delete the rows of the nodes that lost their parent: `DELETE` of a node does not delete its children
export const sweep = async (db, files) => {
    for (const file of files)
        await sweepFile(db, file);
};
