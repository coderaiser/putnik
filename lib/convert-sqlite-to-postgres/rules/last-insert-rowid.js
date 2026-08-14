import {types} from 'putout';

const {identifier} = types;

export const report = () => 'Replace last_insert_rowid with lastval for PostgreSQL';
export const include = () => [
    'lastInsertRowid(__args)',
];

export const fix = ({node}) => {
    node.callee = identifier('lastval');
};
