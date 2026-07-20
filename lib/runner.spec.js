import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    applyPlan,
    createNode,
} from './putnik.js';

test('applyPlan: update field', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    
    writeAst(db, ast, 'index.js');
    
    const row = db.get(`SELECT * FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    
    applyPlan(db, [{
        op: 'update',
        id: row.id,
        type: 'VariableDeclaration',
        key: 'kind',
        value: 'let',
    }]);
    
    const updated = db.get(`SELECT kind FROM VariableDeclaration WHERE id = ?`, [row.id]);
    
    t.equal(updated.kind, 'let');
    t.end();
});

test('proxy captures update into plan', (t) => {
    const row = {
        id: 1,
        type: 'VariableDeclaration',
        file: 'index.js',
        kind: 'const',
    };
    
    const plan = [];
    const node = createNode(row, plan);
    
    node.kind = 'let';
    
    t.equal(plan.length, 1);
    t.equal(plan[0].op, 'update');
    t.equal(plan[0].key, 'kind');
    t.equal(plan[0].value, 'let');
    t.end();
});
