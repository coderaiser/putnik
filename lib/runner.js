export const runPlugin = (db, plugin, file, {fix = false} = {}) => {
    const rows = db.all(plugin.select, {
        file,
    });
    
    if (!rows.length)
        return [];
    
    if (fix)
        db.run(plugin.fix, {
            file,
        });
    
    return db.all(plugin.report, {
        file,
    });
};
