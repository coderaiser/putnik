import {types} from 'putout';

const {variableDeclaration} = types;

export const detector = () => select(from(variableDeclaration), where(kind === 'const'));

export const report = () => `Prefer let over const`;

export const fix = () => update(variableDeclaration, set(kind === 'let'), where(kind === 'const'));
