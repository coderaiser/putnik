import {NODE_COLUMNS} from './node-columns.js';

const NODE_TYPES = new Set(Object.keys(NODE_COLUMNS));
const SQLITE_DIALECTS = new Set([
    'sqlite',
    'turso',
]);

const isNodeType = (type) => NODE_TYPES.has(type);
const hasNodeParent = ({parent_type}) => isNodeType(parent_type);

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
    
    return pairs.filter(hasNodeParent);
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

const createSqliteTriggers = async (db) => {
    for (const type of NODE_TYPES)
        await db.exec(`
            CREATE TRIGGER IF NOT EXISTS ${type}_sweep AFTER DELETE ON ${type}
            BEGIN
                INSERT OR IGNORE INTO SweepFile (file) VALUES (OLD.file);
            END
        `);
};

const createPostgresTriggers = async (db) => {
    await db.exec(`
        CREATE OR REPLACE FUNCTION sweep_mark() RETURNS trigger AS $$
        BEGIN
            INSERT INTO SweepFile (file) VALUES (OLD.file) ON CONFLICT DO NOTHING;
            RETURN OLD;
        END
        $$ LANGUAGE plpgsql
    `);
    
    for (const type of NODE_TYPES) {
        await db.exec(`
            CREATE OR REPLACE TRIGGER ${type}_sweep AFTER DELETE ON ${type}
            FOR EACH ROW EXECUTE FUNCTION sweep_mark()
        `);
    }
};

// any DELETE of a node, from anywhere, marks the file: the next `transform` or `print` sweeps it
export const createSweepTriggers = async (db) => {
    await db.exec('CREATE TABLE IF NOT EXISTS SweepFile (file TEXT PRIMARY KEY)');
    
    if (SQLITE_DIALECTS.has(db.dialect))
        return await createSqliteTriggers(db);
    
    await createPostgresTriggers(db);
};

export const sweepDirty = async (db) => {
    const rows = await db.all('SELECT file FROM SweepFile');
    const files = [];
    
    for (const {file} of rows) {
        files.push(file);
    }
    
    await sweep(db, files);
    
    for (const file of files)
        await db.run('DELETE FROM SweepFile WHERE file = :file', {
            file,
        });
};
