import {dirname, resolve} from 'node:path';

const isString = (a) => typeof a === 'string';
const escape = (a) => a.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const collect = (value, targets) => {
    if (isString(value)) {
        targets.push(value);
        return targets;
    }
    
    if (value && typeof value === 'object')
        for (const item of Object.values(value))
            collect(item, targets);
    
    return targets;
};

const toRegExp = (path) => {
    const [head, tail] = path.split('*');
    
    return RegExp(`^${escape(head)}.+${escape(tail)}$`);
};

const match = (target, root, files) => {
    const path = resolve(root, target);
    
    if (!target.includes('*'))
        return files.filter((file) => [path, `${path}.js`, `${path}/index.js`].includes(file));
    
    const regexp = toRegExp(path);
    
    return files.filter((file) => regexp.test(file));
};

export const getEntries = (packagePath, pkg, files) => {
    const root = dirname(packagePath);
    const targets = collect([
        pkg.main,
        pkg.module,
        pkg.types,
        pkg.typings,
        pkg.bin,
        pkg.exports,
    ], []);
    
    const entries = new Set();
    
    const inside = files.filter((file) => file.startsWith(`${root}/`));
    
    for (const target of targets)
        for (const file of match(target, root, inside))
            entries.add(file);
    
    return [...entries].sort();
};
