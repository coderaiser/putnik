import {test} from 'supertape';
import {parse, traverse} from '@putout/babel';
import {filter} from './index.js';

const runFilter = (source) => {
    const ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    
    let result = null;
    
    traverse(ast, {
        CallExpression(path) {
            if (result !== null)
                return;
            
            if (path.node.callee.type !== 'Identifier' || path.node.callee.name !== 'where')
                return;
            
            result = filter(path);
        },
    });
    
    return result;
};

test('sql-plugin: add-file-to-where: filter: parent of from is not call: no-select-call', (t) => {
    const result = runFilter('from(users, where(kind === "const"));');
    
    t.equal(result, false);
    t.end();
});

test('sql-plugin: add-file-to-where: filter: parent of select is not select call: wrong-select-callee', (t) => {
    const result = runFilter(`section('@select', update('*', from(users, where(kind === 'const'))));`);
    
    t.equal(result, false);
    t.end();
});
