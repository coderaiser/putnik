import {montag} from 'montag';
import {NODE_COLUMNS} from './node-columns.js';

const isObject = (a) => a && typeof a === 'object';

const {entries} = Object;

const SKIP = new Set([
    'type',
    'start',
    'end',
    'loc',
    'extra',
    'leadingComments',
    'trailingComments',
    'innerComments',
]);

const WRITERS = {
    Identifier(node) {
        return {
            name: node.name,
        };
    },
    StringLiteral(node) {
        return {
            value: node.value,
        };
    },
    NumericLiteral(node) {
        return {
            value: node.value,
        };
    },
    VariableDeclaration(node) {
        return {
            kind: node.kind,
        };
    },
    Program(node) {
        return {
            source_type: node.sourceType,
        };
    },
    BooleanLiteral(node) {
        return {
            value: Number(node.value),
        };
    },
    NullLiteral() {
        return {};
    },
    RegExpLiteral(node) {
        return {
            pattern: node.pattern,
            flags: node.flags,
        };
    },
    TemplateElement(node) {
        return {
            cooked: node.value.cooked,
            raw: node.value.raw,
            tail: Number(node.tail),
        };
    },
    FunctionDeclaration(node) {
        return {
            generator: Number(node.generator),
            async: Number(node.async),
        };
    },
    FunctionExpression(node) {
        return {
            generator: Number(node.generator),
            async: Number(node.async),
        };
    },
    ArrowFunctionExpression(node) {
        return {
            generator: Number(node.generator),
            async: Number(node.async),
        };
    },
    ClassMethod(node) {
        return {
            kind: node.kind,
            static: Number(node.static),
            computed: Number(node.computed),
            generator: Number(node.generator),
            async: Number(node.async),
        };
    },
    ClassPrivateMethod(node) {
        return {
            kind: node.kind,
            static: Number(node.static),
            computed: Number(node.computed),
            generator: Number(node.generator),
            async: Number(node.async),
        };
    },
    ObjectMethod(node) {
        return {
            kind: node.kind,
            computed: Number(node.computed),
            generator: Number(node.generator),
            async: Number(node.async),
        };
    },
    ObjectProperty(node) {
        return {
            computed: Number(node.computed),
            method: Number(node.method),
            shorthand: Number(node.shorthand),
        };
    },
    ClassProperty(node) {
        return {
            static: Number(node.static),
            computed: Number(node.computed),
        };
    },
    ClassPrivateProperty(node) {
        return {
            static: Number(node.static),
            computed: Number(node.computed),
        };
    },
    AssignmentExpression(node) {
        return {
            operator: node.operator,
        };
    },
    BinaryExpression(node) {
        return {
            operator: node.operator,
        };
    },
    LogicalExpression(node) {
        return {
            operator: node.operator,
        };
    },
    UnaryExpression(node) {
        return {
            operator: node.operator,
            prefix: Number(node.prefix),
        };
    },
    UpdateExpression({operator, prefix}) {
        return {
            operator,
            prefix: Number(prefix),
        };
    },
    MemberExpression({computed}) {
        return {
            computed: Number(computed),
        };
    },
    OptionalMemberExpression(node) {
        return {
            computed: Number(node.computed),
        };
    },
    ForOfStatement(node) {
        return {
            await: Number(node.await),
        };
    },
    YieldExpression({delegate}) {
        return {
            delegate: Number(delegate),
        };
    },
    ImportDeclaration({source}) {
        return {
            source_value: source.value,
        };
    },
    JSXIdentifier(node) {
        return {
            name: node.name,
        };
    },
    JSXOpeningElement({selfClosing}) {
        return {
            self_closing: Number(selfClosing),
        };
    },
    JSXText(node) {
        return {
            value: node.value,
        };
    },
    BigIntLiteral(node) {
        return {
            value: node.bigint,
        };
    },
};

const writeNode = async (db, node, file, parentId, parentType, parentField) => {
    if (!isObject(node) || !node.type)
        return null;
    
    const {type, loc} = node;
    const write = WRITERS[type];
    const extra = write ? write(node) : {};
    
    const id = await insertNode(
        db,
        type,
        file,
        parentId,
        parentType,
        parentField,
        loc,
        extra,
    );
    
    if (id === null)
        return null;
    
    for (const [key, val] of entries(node)) {
        if (SKIP.has(key))
            continue;
        
        if (Array.isArray(val)) {
            for (const child of val)
                await writeNode(db, child, file, id, type, key);
            
            continue;
        }
        
        if (isObject(val) && val.type)
            await writeNode(db, val, file, id, type, key);
    }
    
    return id;
};

export const writeAst = async (db, ast, file) => writeNode(db, ast.program, file, null, null, null);

export const insertNode = async (db, type, file, parentId, parentType, parentField, loc, extra) => {
    if (!(type in NODE_COLUMNS))
        return null;
    
    const {start, end} = loc;
    const startLine = start.line;
    const startCol = start.column;
    const endLine = end.line;
    const endCol = end.column;
    
    const extraKeys = Object.keys(extra);
    const extraCols = extraKeys.length ? `, ${extraKeys.join(', ')}` : '';
    
    const values = [
        file,
        parentId,
        parentType,
        parentField,
        startLine,
        startCol,
        endLine,
        endCol,
    ];
    
    const valuePlaceholders = Array(8)
        .fill('?')
        .join();
    
    const extraPlaceholders = Array(extraKeys.length).fill('?');
    const extraVals = !extraKeys.length ? '' : `, ${extraPlaceholders.join(', ')}`;
    
    for (const key of extraKeys)
        values.push(extra[key]);
    
    return await db.insert(montag`
        INSERT INTO "${type}"
            (file, parent_id, parent_type, parent_field, start_line, start_col, end_line, end_col ${extraCols})
            VALUES (${valuePlaceholders} ${extraVals})
    `, values);
};
