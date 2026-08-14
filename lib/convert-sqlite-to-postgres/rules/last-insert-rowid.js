import {types} from 'putout';

const {identifier} = types;

export const report = () => 'Replace last_insert_rowid with lastval for PostgreSQL';
export const include = () => ['lastInsertRowid(__args)'];

export const fix = (path) => {
    const node = path.node;

    if (node.type !== 'CallExpression' || node.callee.name !== 'lastInsertRowid')
        return;

    node.callee = identifier('lastval');
};
