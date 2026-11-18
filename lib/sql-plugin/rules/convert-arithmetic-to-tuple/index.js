import {types} from 'putout';

const {
    callExpression,
    identifier,
    isBinaryExpression,
    isNumericLiteral,
} = types;

const COMPARISON = [
    '>',
    '<',
    '>=',
    '<=',
    '===',
    '!==',
];

const isPosition = (node) => {
    if (!isBinaryExpression(node, {operator: '+'}))
        return false;
    
    const {left} = node;
    
    if (!isBinaryExpression(left, {operator: '*'}))
        return false;
    
    return isNumericLiteral(left.right);
};

const getMultiplier = (node) => node.left.right.value;

export const report = () => `Use 'tuple' instead of arithmetic comparison`;

export const include = () => [
    'BinaryExpression',
];

export const filter = ({node}) => {
    if (!COMPARISON.includes(node.operator))
        return false;
    
    const {left, right} = node;
    
    if (!isPosition(left) || !isPosition(right))
        return false;
    
    return getMultiplier(left) === getMultiplier(right);
};

const createTuple = ({left, right}) => callExpression(identifier('tuple'), [
    left.left,
    right,
]);

export const fix = ({node}) => {
    node.left = createTuple(node.left);
    node.right = createTuple(node.right);
};
