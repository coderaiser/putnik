import {types} from 'putout';

const {stringLiteral, callExpression, identifier} = types;

export const report = () => 'Replace last_insert_rowid with lastval for PostgreSQL';
export const include = () => ['lastInsertRowid(__args)'];

export const fix = () => {};
