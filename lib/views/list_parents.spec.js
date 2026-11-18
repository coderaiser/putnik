import {test} from 'supertape';
import {parse} from '../putnik.js';

const PARENTS = `('Program', 'BlockStatement', 'StaticBlock', 'TSModuleBlock', 'SwitchCase')`;

test('putnik: views: list_parents: has five rows', async (t) => {
    const db = await parse('t.js', '');
    const [{count}] = await db.all('SELECT COUNT(*) AS count FROM list_parents');
    
    t.equal(count, 5);
    t.end();
});

test('putnik: views: list_parents: has the statement parents', async (t) => {
    const db = await parse('t.js', '');
    const [{count}] = await db.all(`SELECT COUNT(*) AS count FROM list_parents WHERE parent_type IN ${PARENTS}`);
    
    t.equal(count, 5);
    t.end();
});
