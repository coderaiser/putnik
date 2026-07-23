const parseCreateTable = (query) => {
    const match = query.match(/CREATE TABLE IF NOT EXISTS\s+"?(\w+)"?\s*\(/);
    return match ? match[1] : null;
};

const parseInsert = (query, params) => {
    // INSERT INTO "table" (col1, col2) VALUES (?, ?) or VALUES (:col1, :col2)
    const match = query.match(/INSERT\s+(?:OR REPLACE\s+)?INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    
    if (!match)
        return null;
    
    const [, table] = match;
    
    const cols = match[2]
        .split(',')
        .map((c) => c
            .trim()
            .replace(/"/g, ''));
    
    const rawPlaceholders = match[3]
        .split(',')
        .map((p) => p.trim());
    
    const values = {};
    let i = 0;
    
    for (const col of cols) {
        const placeholder = rawPlaceholders[i];
        
        if (placeholder === '?')
            values[col] = Array.isArray(params) ? params[i] : Object.values(params)[i] ?? null;
        else if (placeholder.startsWith(':'))
            values[col] = params[placeholder.slice(1)] ?? null;
        else if (placeholder.startsWith('$'))
            values[col] = Array.isArray(params) ? params[parseInt(placeholder.slice(1)) - 1] : null;
        else
            values[col] = null;
        
        i++;
    }
    
    return {
        table,
        values,
    };
};

const parseSelectCols = (query) => {
    const match = query.match(/SELECT\s+(.+?)\s+FROM\s/i);
    return match[1].split(',').map((c) => c.trim());
};

const parseSelectTable = (query) => {
    const match = query.match(/FROM\s+"?(\w+)"?/i);
    return match ? match[1] : null;
};

const parseWhereCondition = (condition) => {
    // col = :param or col = ?
    const namedMatch = condition.match(/"?(\w+)"?\s*=\s*(:\w+)/);
    
    if (namedMatch)
        return {
            key: namedMatch[1],
            paramKey: namedMatch[2].slice(1),
        };
    
    const positionalMatch = condition.match(/"?(\w+)"?\s*=\s*\?/);
    
    if (positionalMatch)
        return {
            key: positionalMatch[1],
            paramKey: null,
            positional: true,
        };
    
    return null;
};

const parseWhere = (query) => {
    const match = query.match(/WHERE\s+(.+)$/i);
    
    if (!match)
        return [];
    
    const conditions = [];
    const parts = match[1].split(/\s+AND\s+/i);
    
    for (const part of parts) {
        const cond = parseWhereCondition(part.trim());
        
        if (cond)
            conditions.push(cond);
    }
    
    return conditions;
};

const matchRow = (row, conditions, params) => {
    for (const cond of conditions) {
        let val;
        
        if (cond.positional)
            val = Array.isArray(params) ? params[0] : Object.values(params)[0] ?? null;
        else
            val = params[cond.paramKey] ?? null;
        
        if (row[cond.key] !== val)
            return false;
    }
    
    return true;
};

const pickCols = (row, selectCols) => {
    const result = {};
    
    if (selectCols.length === 1 && selectCols[0] === '*')
        return row;
    
    for (const col of selectCols) {
        const clean = col.replace(/"/g, '');
        
        if (clean in row)
            result[clean] = row[clean];
    }
    
    return result;
};

export const createDb = () => {
    const tables = new Map();
    const counters = new Map();
    
    const getTable = (name) => {
        if (!tables.has(name))
            tables.set(name, []);
        
        return tables.get(name);
    };
    
    const nextId = (name) => {
        const id = (counters.get(name) ?? 0) + 1;
        counters.set(name, id);
        
        return id;
    };
    
    const exec = (query) => {
        const tableName = parseCreateTable(query);
        
        if (tableName) {
            if (!tables.has(tableName))
                tables.set(tableName, []);
            
            return;
        }
        
        // silently ignore CREATE INDEX, CREATE VIEW, DROP VIEW
        if (/CREATE\s+(INDEX|VIEW)|DROP\s+VIEW/i.test(query))
            return;
    };
    
    const run = (query, params = {}) => {
        const insert = parseInsert(query, params);
        
        if (insert) {
            const id = nextId(insert.table);
            
            getTable(insert.table).push({
                id,
                ...insert.values,
            });
            
            return;
        }
    };
    
    const all = (query, params = {}) => {
        const table = parseSelectTable(query);
        
        if (!table)
            return [];
        
        const selectCols = parseSelectCols(query);
        const rows = getTable(table);
        const conditions = parseWhere(query);
        const result = [];
        
        for (const row of rows) {
            if (matchRow(row, conditions, params))
                result.push(pickCols(row, selectCols));
        }
        
        return result;
    };
    
    const get = async (query, params = {}) => {
        const rows = await all(query, params);
        return rows[0] ?? null;
    };
    
    const insert = (query, params = {}) => {
        const insert = parseInsert(query, params);
        
        if (!insert)
            return null;
        
        const id = nextId(insert.table);
        
        getTable(insert.table).push({
            id,
            ...insert.values,
        });
        
        return id;
    };
    
    const upsert = (table, key, data) => {
        const rows = getTable(table);
        let found = null;
        
        for (const row of rows) {
            if (row[key] === data[key]) {
                found = row;
                break;
            }
        }
        
        if (found) {
            for (const k of Object.keys(data))
                found[k] = data[k];
            
            return;
        }
        
        rows.push(data);
    };
    
    const transaction = async (fn) => fn();
    
    return {
        dialect: 'test',
        primaryKey: 'INTEGER PRIMARY KEY',
        run,
        all,
        get,
        insert,
        exec,
        transaction,
        upsert,
        end: async () => {},
    };
};
