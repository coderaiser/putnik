const {isArray} = Array;

// node:sqlite returns rows with null prototype
const toRow = (row) => row && {
    ...row,
};

const toArgs = (params) => {
    if (!params)
        return [];
    
    if (isArray(params))
        return params;
    
    return [params];
};

const read = {
    all: (rows) => rows.map(toRow),
    get: toRow,
    run: (result) => result,
};

export const prepare = (db, name, suffix, value) => {
    const cache = new Map();
    
    const call = (query, params) => {
        if (suffix)
            query = `${query} ${suffix}`;
        
        let prepared = cache.get(query);
        
        if (!prepared) {
            prepared = db.prepare(query);
            cache.set(query, prepared);
        }
        
        const result = read[name](prepared[name](...toArgs(params)));
        
        if (value)
            return result[value];
        
        return result;
    };
    
    call.clear = () => cache.clear();
    
    return call;
};
