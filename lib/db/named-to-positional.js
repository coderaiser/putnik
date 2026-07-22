export const namedToPositional = (query, params = {}) => {
    const keys = [];
    const sql = query.replace(/:\w+/g, (match) => {
        keys.push(match.slice(1));
        return '$' + keys.length;
    });
    
    const values = [];
    
    for (const key of keys)
        values.push(params[key] || null);
    
    return {
        sql,
        values,
    };
};
