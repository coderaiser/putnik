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
    
    return await db.all(plugin.report, {
        file,
    });
};
