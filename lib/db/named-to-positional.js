export const namedToPositional = (query, params = {}) => {
    const keys = [];
    const sql = query.replace(/:\w+/g, (match) => {
        keys.push(match.slice(1));
        return '$' + keys.length;
    });
    return {sql, values: keys.map((k) => params[k] ?? null)};
};
