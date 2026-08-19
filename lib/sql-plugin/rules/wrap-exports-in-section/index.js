import {types} from 'putout';
import {imperativeToAst} from '../../../imperative/imperative.js';

const {
    identifier,
    stringLiteral,
    tsAsExpression,
    tsLiteralType,
    callExpression,
    isIdentifier,
    isCallExpression,
} = types;

const SECTIONS = {
    detector: '@select',
    report: '@report',
    fix: '@fix',
};

export const report = () => 'Wrap detector/report/fix exports in a section';

export const include = () => [
    'ExportNamedDeclaration',
];

export const filter = (path) => {
    const {init} = getDeclarator(path);
    const {body} = init;
    
    return !isSectionCall(body);
};

export const fix = (path) => {
    const declarator = getDeclarator(path);
    const tag = SECTIONS[declarator.id.name];
    
    wrapExport(path, declarator, tag);
};

const isSectionCall = (node) => {
    if (!isCallExpression(node))
        return false;
    
    return isIdentifier(node.callee, {
        name: 'section',
    });
};

const getDeclarator = (path) => {
    const {declaration} = path.node;
    const [declarator] = declaration.declarations;
    
    return declarator;
};

const buildSection = (tag, inner) => {
    return callExpression(identifier('section'), [
        stringLiteral(tag),
        inner,
    ]);
};

const buildReport = (message) => {
    const arg = tsAsExpression(
        stringLiteral(message),
        tsLiteralType(stringLiteral('message')),
    );
    const select = callExpression(identifier('select'), [arg]);
    
    return buildSection('@report', select);
};

const buildImperative = (bodyPath) => {
    const expression = imperativeToAst(bodyPath.node);
    
    return buildSection('@fix', expression);
};

const wrapExport = (path, declarator, tag) => {
    const arrow = path.get('declaration.declarations.0.init');
    const {body} = arrow.node;
    
    if (declarator.id.name === 'report') {
        const message = body.quasis[0].value.cooked;
        
        arrow.node.body = buildReport(message);
        
        return;
    }
    
    if (declarator.id.name === 'fix' && body.type === 'BlockStatement') {
        arrow.node.body = buildImperative(arrow.get('body'));
        return;
    }
    
    arrow.node.body = buildSection(tag, body);
};
