/* eslint no-undef: off, putout/declare: off */
/* global select, from, where, update, set, kind, VariableDeclaration */
export const detector = () => select(from(VariableDeclaration), where(kind === 'const'));

export const report = () => `Prefer let over const`;

export const fix = () => update(VariableDeclaration, set(kind === 'let'), where(kind === 'const'));


