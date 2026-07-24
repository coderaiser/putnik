export const runPlugin = async (db, plugin, file, {fix = false} = {}) => {
    const rows = await db.all(plugin.select, {
        file,
    });
    
    if (!rows.length)
        return [];
    
    if (fix)
        for (const row of rows)
            await db.run(plugin.fix, {
                ...row,
                file,
            });
    
    const rowParams = {};
    
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!(key in rowParams))
                rowParams[key] = row[key];
        }
    }
    
    return await db.all(plugin.report, {
        ...rowParams,
        file,
    });
};
