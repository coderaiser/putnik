import {test} from 'supertape';
import {toSnake} from '../lib/to-snake.js';

test('toSnake: PascalCase node type', (t) => {
    const result = toSnake('FunctionDeclaration');
    const expected = 'function_declaration';
    
    t.equal(result, expected);
    t.end();
});

test('toSnake: camelCase field', (t) => {
    const result = toSnake('selfClosing');
    const expected = 'self_closing';
    
    t.equal(result, expected);
    t.end();
});

test('toSnake: already lowercase', (t) => {
    const result = toSnake('body');
    const expected = 'body';
    
    t.equal(result, expected);
    t.end();
});

test('toSnake: single uppercase letter start', (t) => {
    const result = toSnake('Program');
    const expected = 'program';
    
    t.equal(result, expected);
    t.end();
});
