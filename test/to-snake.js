import {test} from 'supertape';
import {toSnake} from '../lib/to-snake.js';

test('toSnake: PascalCase node type', (t) => {
    t.equal(toSnake('FunctionDeclaration'), 'function_declaration');
    t.end();
});

test('toSnake: camelCase field', (t) => {
    t.equal(toSnake('selfClosing'), 'self_closing');
    t.end();
});

test('toSnake: already lowercase', (t) => {
    t.equal(toSnake('body'), 'body');
    t.end();
});

test('toSnake: single uppercase letter start', (t) => {
    t.equal(toSnake('Program'), 'program');
    t.end();
});
