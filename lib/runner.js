import {montag} from 'montag';
import {NODE_COLUMNS} from './node-columns.js';
import {nextId} from './next-id.js';

export const runPlugin = (db, plugin, file, {fix = false} = {}) => {
    const places = [];
    const types = plugin.include ? plugin.include() : [];
    
    for (const type of types) {
        const rows = db.all(`SELECT *, '${type}' AS type FROM "${type}" WHERE file = ?`, [file]);
        
        for (const row of rows) {
            places.push({
                rule: plugin.message,
                message: plugin.message,
                position: {
                    line: row.start_line,
                    column: row.start_col,
                },
            });
            
            if (!fix)
                continue;
            
            const plan = [];
            plugin.fix(createNode(row, plan));
            db.transaction(() => applyPlan(db, plan));
        }
    }
    
    if (!plugin.select)
        return places;
    
    const query = plugin.select.replace(':file', `'${file}'`);
    const rows = db.all(query);
    
    for (const row of rows) {
        places.push({
            rule: plugin.message,
            message: plugin.message,
            position: {
                line: row.start_line,
                column: row.start_col,
            },
        });
        
        if (!fix || !plugin.fix)
            continue;
        
        const plan = [];
        plugin.fix(createNode(row, plan));
        db.transaction(() => applyPlan(db, plan));
    }
    
    return places;
};

export const createNode = (row, plan) => new Proxy({
    ...row,
}, {
    set(target, key, value) {
        target[key] = value;
        
        if (value && typeof value === 'object' && value.__type) {
            plan.push({
                op: 'replace',
                parentId: target.id,
                parentField: key,
                newNode: value,
                file: target.file,
            });
            return true;
        }
        
        plan.push({
            op: 'update',
            id: target.id,
            type: target.type,
            key,
            value,
        });
        
        return true;
    },
});

export const applyPlan = (db, plan) => {
    for (const step of plan) {
        if (step.op === 'update') {
            db.run(`UPDATE "${step.type}" SET "${step.key}" = ? WHERE id = ?`, [step.value, step.id]);
            continue;
        }
        
        if (step.op === 'replace') {
            for (const type of Object.keys(NODE_COLUMNS))
                db.run(`DELETE FROM "${type}" WHERE parent_id = ? AND parent_field = ?`, [step.parentId, step.parentField]);
            
            const {__type: type, ...fields} = step.newNode;
            const id = nextId();
            const value = fields.value || fields.name;
            
            db.run(montag`
                INSERT INTO "${type}" (id, file, parent_id, parent_field, value)
                    VALUES (?, ?, ?, ?, ?)
            `, [
                id,
                step.file,
                step.parentId,
                step.parentField,
                value,
            ]);
        }
    }
};
