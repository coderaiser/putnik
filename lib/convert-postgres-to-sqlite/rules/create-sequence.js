export const report = () => 'Remove CREATE SEQUENCE for SQLite';

export const include = () => [
    'createSequence(__name)',
];

export const fix = (path) => {
    const {elements} = path.parentPath.node;
    const index = elements.indexOf(path.node);
    
    if (index >= 0)
        elements.splice(index, 1);
};
