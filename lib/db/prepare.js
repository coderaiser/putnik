export const prepare = (db, name, suffix, value) => (query, params) => {
    if (suffix)
        query = `${query} ${suffix}`;
    
    const prepared = db.prepare(query);
    
    if (params) {
        const result = prepared[name](params);
        
        if (value)
            return result[value];
        
        return result;
    }
    
    const result = prepared[name]();
    
    if (value)
        return result.value;
    
    return result;
};

