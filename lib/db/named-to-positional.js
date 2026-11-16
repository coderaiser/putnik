const {isArray} = Array;

const fromArray = (query, params) => {
    let index = 0;
    const sql = query.replace(/\?/g, () => `$${++index}`);
    
    return {
        sql,
        values: params,
    };
};

export const namedToPositional = (query, params = {}) => {
    if (isArray(params))
        return fromArray(query, params);
    
    const keys = [];
    const sql = query.replace(/:\w+/g, (match) => {
        keys.push(match.slice(1));
        return '$' + keys.length;
    });
    
    const values = [];
    
    for (const key of keys) {
        const value = Object.hasOwn(params, key) ? params[key] : null;
        values.push(value);
    }
    
    return {
        sql,
        values,
    };
};
