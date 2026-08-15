export const report = () => 'Remove CREATE SEQUENCE for SQLite';

export const include = () => ['createSequence(__name)'];

export const fix = (path) => {
    const elements = path.parentPath.node.elements;
    elements.splice(elements.indexOf(path.node), 1);
};