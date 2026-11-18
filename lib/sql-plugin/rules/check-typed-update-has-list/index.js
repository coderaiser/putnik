import {
    findTypeList,
    getParameter,
    getTypeLeaf,
    isUpdateOnNodes,
} from '../typed-update.js';

export const report = () => `Add 'inList' of node types to @select for the update on 'nodes'`;

const hasNoList = (path) => {
    if (!isUpdateOnNodes(path.node))
        return false;
    
    const leaf = getTypeLeaf(path.node);
    
    if (!leaf)
        return true;
    
    return !findTypeList(path, getParameter(leaf)).length;
};

export const match = () => ({
    'update(__args)': (vars, path) => hasNoList(path),
});

export const replace = () => ({
    'update(__args)': (vars, path) => path,
});
