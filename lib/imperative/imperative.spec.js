import {test} from 'supertape';
import {tryCatch} from 'try-catch';
import {convertJsToSql} from 'happy-sql';
import {parse, generate} from '@putout/babel';
import {
    convertImperative,
    imperativeToAst,
} from './imperative.js';

test('putnik: convertImperative: rejects let', (t) => {
    const [err] = tryCatch(convertImperative, `let x = insert(A, {file})`);
    
    t.match(err.message, 'let');
    t.end();
});

test('putnik: convertImperative: rejects if', (t) => {
    const [err] = tryCatch(convertImperative, `if (x) insert(A, {file})`);
    
    t.match(err.message, 'if');
    t.end();
});

test('putnik: convertImperative: rejects reassignment', (t) => {
    const [err] = tryCatch(convertImperative, `const x = insert(A, {file})\nx = insert(B, {file})`);
    
    t.match(err.message, 'reassign');
    t.end();
});

test('putnik: convertImperative: rejects unknown binding', (t) => {
    const [err] = tryCatch(convertImperative, `insert(A, {file: foo.id})`);
    
    t.match(err.message, 'unknown binding: foo');
    t.end();
});

test('putnik: convertImperative: single insert', (t) => {
    const result = convertImperative(`insert(CallExpression, {file, parent_id})`);
    
    t.equal(result, `insert(into(CallExpression, [file, parent_id], values(':file', ':parent_id')))`);
    t.end();
});

test('putnik: convertImperative: rejects while', (t) => {
    const [err] = tryCatch(convertImperative, `while (x) insert(A, {file})`);
    
    t.match(err.message, 'while');
    t.end();
});

test('putnik: convertImperative: rejects for', (t) => {
    const [err] = tryCatch(convertImperative, `for (;;) insert(A, {file})`);
    
    t.match(err.message, 'for');
    t.end();
});

test('putnik: convertImperative: rejects unsupported statement', (t) => {
    const [err] = tryCatch(convertImperative, `debugger`);
    
    t.match(err.message, 'Unsupported statement');
    t.end();
});

test('putnik: convertImperative: rejects non-identifier table', (t) => {
    const [err] = tryCatch(convertImperative, `insert(123, {file})`);
    
    t.match(err.message, 'table identifier');
    t.end();
});

test('putnik: convertImperative: rejects unsupported field reference', (t) => {
    const [err] = tryCatch(convertImperative, `insert(A, {x: foo[0]})`);
    
    t.match(err.message, 'Unsupported field reference');
    t.end();
});

test('putnik: convertImperative: rejects unsupported field value', (t) => {
    const [err] = tryCatch(convertImperative, `insert(A, {x: 123})`);
    
    t.match(err.message, 'Unsupported field value');
    t.end();
});

test('putnik: convertImperative: unreferenced leading named op', (t) => {
    const src = `
        const extra = insert(Extra, {file})
        const call = insert(CallExpression, {file})
        insert(MemberExpression, {file, parent_id: call.id})
    `;
    
    t.match(convertImperative(src), 'withNamed');
    t.end();
});

test('putnik: convertImperative: explicit input value', (t) => {
    const result = convertImperative(`insert(A, {x: y})`);
    
    t.equal(result, `insert(into(A, [x], values(':y')))`);
    t.end();
});

test('putnik: convertImperative: rejects missing fields object', (t) => {
    const [err] = tryCatch(convertImperative, `insert(A)`);
    
    t.match(err.message, 'object of fields');
    t.end();
});

test('putnik: convertImperative: rejects unsupported binding', (t) => {
    const [err] = tryCatch(convertImperative, `const [a] = insert(A, {file})`);
    
    t.match(err.message, 'Unsupported binding');
    t.end();
});

test('putnik: convertImperative: rejects const non-insert', (t) => {
    const [err] = tryCatch(convertImperative, `const x = 5`);
    
    t.match(err.message, 'Expected insert');
    t.end();
});

test('putnik: convertImperative: rejects plain call statement', (t) => {
    const [err] = tryCatch(convertImperative, `foo()`);
    
    t.match(err.message, 'Expected insert');
    t.end();
});

const CHAIN = `
    const call = insert(CallExpression, {file, parent_id})
    insert(MemberExpression, {file, parent_id: call.id})
`;

test('putnik: convertImperative: chain two: withNamed', (t) => {
    t.match(convertImperative(CHAIN), 'withNamed');
    t.end();
});

test('putnik: convertImperative: chain two: returning id', (t) => {
    t.match(convertImperative(CHAIN), 'returning(id)');
    t.end();
});

test('putnik: convertImperative: chain two: from binding', (t) => {
    t.match(convertImperative(CHAIN), 'from(call)');
    t.end();
});

test('putnik: convertImperative: no RETURNING when not referenced', (t) => {
    const src = `
        const call = insert(CallExpression, {file})
        insert(MemberExpression, {file})
    `;
    
    t.notMatch(convertImperative(src), 'returning');
    t.end();
});

const ROUND_TRIP = `
    const call = insert(CallExpression, {file, parent_id})
    const member = insert(MemberExpression, {file, parent_id: call.id})
    insert(Identifier, {file, name: 'isNaN', parent_id: member.id})
`;

test('putnik: convertImperative: round-trip: WITH', (t) => {
    const sql = convertJsToSql(`[${convertImperative(ROUND_TRIP)}]`);
    
    t.match(sql, 'WITH');
    t.end();
});

test('putnik: convertImperative: round-trip: RETURNING', (t) => {
    const sql = convertJsToSql(`[${convertImperative(ROUND_TRIP)}]`);
    
    t.match(sql, 'RETURNING id');
    t.end();
});

test('putnik: convertImperative: round-trip: FROM', (t) => {
    const sql = convertJsToSql(`[${convertImperative(ROUND_TRIP)}]`);
    
    t.match(sql, 'FROM call');
    t.end();
});

const compileAst = (source) => {
    const {program} = parse(source);
    
    return generate(imperativeToAst(program)).code;
};

test('putnik: imperativeToAst: single insert', (t) => {
    const result = compileAst(`insert(CallExpression, {file, parent_id})`);
    
    t.equal(result, `insert(into(CallExpression, [file, parent_id], values(":file", ":parent_id")))`);
    t.end();
});

test('putnik: imperativeToAst: multiple inserts', (t) => {
    const result = compileAst(`insert(A, {file})
insert(B, {file})`);
    
    t.match(result, /into\(A[\s\S]*into\(B/);
    t.end();
});

test('putnik: imperativeToAst: chain with RETURNING', (t) => {
    const result = compileAst(CHAIN);
    
    t.match(result, /withNamed[\s\S]*returning\(id\)/);
    t.end();
});

test('putnik: imperativeToAst: chain with FROM', (t) => {
    const result = compileAst(CHAIN);
    
    t.match(result, 'from(call)');
    t.end();
});

test('putnik: imperativeToAst: no RETURNING when not referenced', (t) => {
    const result = compileAst(`
        const call = insert(CallExpression, {file})
        insert(MemberExpression, {file})
    `);
    
    t.notMatch(result, 'returning');
    t.end();
});

test('putnik: imperativeToAst: round-trip', (t) => {
    const ast = imperativeToAst(parse(ROUND_TRIP).program);
    const sql = convertJsToSql(`[${generate(ast).code}]`);
    
    t.match(sql, /WITH[\s\S]*RETURNING id[\s\S]*FROM call/);
    t.end();
});
