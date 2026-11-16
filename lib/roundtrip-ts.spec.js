import putout from 'putout';
import {test} from 'supertape';
import putnik from './putnik.js';

const native = (source, name) => putout.print(putout.parse(source, {
    isTS: true,
    isJSX: name.endsWith('x'),
}));

const roundtrip = async (source, name) => {
    const [code] = await putnik(name, source, {
        fix: true,
        plugins: [],
    });
    
    return code;
};

const check = async (t, source, name = 'test.ts') => {
    const result = await roundtrip(source, name);
    const expected = native(source, name);
    
    t.equal(result, expected);
};

test('putnik: roundtrip: ts: import type', async (t) => {
    await check(t, `import type {A} from 'a';`);
    t.end();
});

test('putnik: roundtrip: ts: import type default', async (t) => {
    await check(t, `import type A from 'a';`);
    t.end();
});

test('putnik: roundtrip: ts: import inline type', async (t) => {
    await check(t, `import {type A, b} from 'a';`);
    t.end();
});

test('putnik: roundtrip: ts: export type from', async (t) => {
    await check(t, `export type {A} from 'a';`);
    t.end();
});

test('putnik: roundtrip: ts: export type alias', async (t) => {
    await check(t, `export type A = {b: number};`);
    t.end();
});

test('putnik: roundtrip: ts: type alias generic', async (t) => {
    await check(t, `type A<T> = T[];`);
    t.end();
});

test('putnik: roundtrip: ts: interface members', async (t) => {
    await check(t, `interface A {
    b: number;
    c?: string;
    readonly d: number;
}`);
    t.end();
});

test('putnik: roundtrip: ts: interface extends', async (t) => {
    await check(t, `interface A extends B, C<D> {}`);
    t.end();
});

test('putnik: roundtrip: ts: function generic optional', async (t) => {
    await check(t, `function f<T>(a: T, b?: number): void {}`);
    t.end();
});

test('putnik: roundtrip: ts: variable annotation', async (t) => {
    await check(t, `const a: number = 1;`);
    t.end();
});

test('putnik: roundtrip: ts: as and satisfies', async (t) => {
    await check(t, `const a = b as string;
const c = d satisfies E;`);
    t.end();
});

test('putnik: roundtrip: ts: non null', async (t) => {
    await check(t, `a!.b;`);
    t.end();
});

test('putnik: roundtrip: ts: enum', async (t) => {
    await check(t, `enum A {
    B = 1,
    C,
}`);
    t.end();
});

test('putnik: roundtrip: ts: const enum', async (t) => {
    await check(t, `const enum A {
    B,
}`);
    t.end();
});

test('putnik: roundtrip: ts: declare enum', async (t) => {
    await check(t, `declare enum A {
    B,
}`);
    t.end();
});

test('putnik: roundtrip: ts: class modifiers', async (t) => {
    await check(t, `class A {
    private a = 1;
    protected b;
    public readonly c: number;
    static d;
}`);
    t.end();
});

test('putnik: roundtrip: ts: abstract class', async (t) => {
    await check(t, `abstract class A {
    abstract e(): void;
}`);
    t.end();
});

test('putnik: roundtrip: ts: class implements', async (t) => {
    await check(t, `class A implements B, C {}`);
    t.end();
});

test('putnik: roundtrip: ts: parameter properties', async (t) => {
    await check(t, `class A {
    constructor(private a: number, public readonly b = 1) {}
}`);
    t.end();
});

test('putnik: roundtrip: ts: override', async (t) => {
    await check(t, `class A extends B {
    override c() {}
}`);
    t.end();
});

test('putnik: roundtrip: ts: definite and optional', async (t) => {
    await check(t, `class A {
    a!: number;
    b?: number;
}`);
    t.end();
});

test('putnik: roundtrip: ts: declare', async (t) => {
    await check(t, `declare const a: number;
declare function f(): void;
declare module 'x' {}`);
    t.end();
});

test('putnik: roundtrip: ts: declare global', async (t) => {
    await check(t, `declare global {
    const a: number;
}`);
    t.end();
});

test('putnik: roundtrip: ts: namespace', async (t) => {
    await check(t, `namespace A {
    export const b = 1;
}`);
    t.end();
});

test('putnik: roundtrip: ts: decorators', async (t) => {
    await check(t, `@a
class A {
    @b c() {}
    @d e = 1;
}`);
    t.end();
});

test('putnik: roundtrip: ts: mapped type', async (t) => {
    await check(t, `type A = {
    readonly [K in B]?: C[K];
};`);
    t.end();
});

test('putnik: roundtrip: ts: mapped type plus minus', async (t) => {
    await check(t, `type A = {
    -readonly [K in B]-?: C;
};`);
    t.end();
});

test('putnik: roundtrip: ts: conditional and infer', async (t) => {
    await check(t, `type A<T> = T extends (infer U)[] ? U : never;`);
    t.end();
});

test('putnik: roundtrip: ts: template literal type', async (t) => {
    await check(t, `type A = \`a\${B}\`;`);
    t.end();
});

test('putnik: roundtrip: ts: tuple types', async (t) => {
    await check(t, `type A = [a: string, b?: number, ...c: boolean[]];`);
    t.end();
});

test('putnik: roundtrip: ts: type operators', async (t) => {
    await check(t, `type A = keyof B;
type C = readonly string[];
type D = unique symbol;`);
    t.end();
});

test('putnik: roundtrip: ts: index signature', async (t) => {
    await check(t, `interface A {
    [key: string]: number;
}`);
    t.end();
});

test('putnik: roundtrip: ts: signatures', async (t) => {
    await check(t, `interface A {
    (a: number): void;
    new (a: number): A;
    b(): void;
    get c(): number;
    set c(d: number);
}`);
    t.end();
});

test('putnik: roundtrip: ts: type predicates', async (t) => {
    await check(t, `function f(a): a is string {}
function g(a): asserts a is string {}
function h(a): asserts a {}`);
    t.end();
});

test('putnik: roundtrip: ts: import equals', async (t) => {
    await check(t, `import a = require('a');
export = a;`);
    t.end();
});

test('putnik: roundtrip: ts: type parameter modifiers', async (t) => {
    await check(t, `type A<in out T, const U extends V = W> = T;`);
    t.end();
});

test('putnik: roundtrip: ts: function and constructor types', async (t) => {
    await check(t, `type A = (a: number) => void;
type B = new (a: number) => C;
type D = abstract new () => E;`);
    t.end();
});

test('putnik: roundtrip: ts: typeof and import types', async (t) => {
    await check(t, `type A = typeof b;
type C = import('c').D;`);
    t.end();
});

test('putnik: roundtrip: ts: static block and accessor', async (t) => {
    await check(t, `class A {
    static {
        a();
    }
    accessor b = 1;
}`);
    t.end();
});

test('putnik: roundtrip: ts: arrow generic', async (t) => {
    await check(t, `const a = <T,>(b: T) => b;`, 'test.tsx');
    t.end();
});

test('putnik: roundtrip: ts: definite variable', async (t) => {
    await check(t, `let a!: number;`);
    t.end();
});

test('putnik: roundtrip: ts: trailing comma', async (t) => {
    await check(t, `const a = [1, 2,];
const b = {c: 1,};`);
    t.end();
});

test('putnik: roundtrip: ts: jsx in tsx', async (t) => {
    await check(t, `const a: number = <div/>;`, 'test.tsx');
    t.end();
});

test('putnik: roundtrip: ts: export type star', async (t) => {
    await check(t, `export type * from 'a';`);
    t.end();
});

test('putnik: roundtrip: ts: instantiation expression', async (t) => {
    await check(t, `const a = b<string>;`);
    t.end();
});

test('putnik: roundtrip: ts: optional chain and generics call', async (t) => {
    await check(t, `a?.b<string>();`);
    t.end();
});

test('putnik: roundtrip: ts: abstract constructor class property', async (t) => {
    await check(t, `abstract class A {
    abstract a: number;
    declare b: string;
}`);
    t.end();
});

test('putnik: roundtrip: ts: enum body string', async (t) => {
    await check(t, `enum A {
    B = 'b',
}`);
    t.end();
});

test('putnik: roundtrip: ts: this type and param', async (t) => {
    await check(t, `function f(this: A) {}
type B = this;`);
    t.end();
});

test('putnik: roundtrip: ts: literal types', async (t) => {
    await check(t, `type A = 1 | 'a' | true | null | -1 | 1n;`);
    t.end();
});

test('putnik: roundtrip: ts: array and union types', async (t) => {
    await check(t, `type A = (string | number)[];
type B = A & {c: 1};`);
    t.end();
});

test('putnik: roundtrip: ts: generic call and new', async (t) => {
    await check(t, `f<string>(a);
new A<string>();`);
    t.end();
});

test('putnik: roundtrip: ts: accessibility on method', async (t) => {
    await check(t, `class A {
    private static async *a() {}
}`);
    t.end();
});

test('putnik: roundtrip: ts: export default interface', async (t) => {
    await check(t, `export default interface A {}`);
    t.end();
});

test('putnik: roundtrip: ts: export declare', async (t) => {
    await check(t, `export declare const a: number;
export declare function f(): void;`);
    t.end();
});

test('putnik: roundtrip: ts: module with string and namespace nested', async (t) => {
    await check(t, `declare namespace A.B {
    const c: number;
}`);
    t.end();
});

test('putnik: roundtrip: ts: object pattern with annotation', async (t) => {
    await check(t, `function f({a, b}: C) {}`);
    t.end();
});

test('putnik: roundtrip: ts: rest parameter', async (t) => {
    await check(t, `function f(...a: number[]) {}`);
    t.end();
});

test('putnik: roundtrip: ts: getter setter with types', async (t) => {
    await check(t, `class A {
    get a(): number {
        return 1;
    }
    set a(b: number) {}
}`);
    t.end();
});
