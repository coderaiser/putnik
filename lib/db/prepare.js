export const prepare = (db, name, suffix, value) => {
    const cache = new Map();
    return (query, params) => {
        if (suffix)
            query = `${query} ${suffix}`;
        
        let prepared = cache.get(query);
        
        if (!prepared) {
            prepared = db.prepare(query);
            cache.set(query, prepared);
        }
        
        if (params) {
            const result = prepared[name](params);
            
            if (value)
                return result[value];
            
            return result;
        }
        
        const result = prepared[name]();
        
        if (value)
            return result[value];
        
        return result;
    };
};
