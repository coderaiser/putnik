import {montag} from 'montag';
import {NODE_COLUMNS} from './node-columns.js';

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
            value: node.value ? 1 : 0,
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
            tail: node.tail ? 1 : 0,
        };
    },
    FunctionDeclaration(node) {
        return {
            generator: node.generator ? 1 : 0,
            async: node.async ? 1 : 0,
        };
    },
    FunctionExpression(node) {
        return {
            generator: node.generator ? 1 : 0,
            async: node.async ? 1 : 0,
        };
    },
    ArrowFunctionExpression(node) {
        return {
            generator: node.generator ? 1 : 0,
            async: node.async ? 1 : 0,
        };
    },
    ClassMethod(node) {
        return {
            kind: node.kind,
            static: node.static ? 1 : 0,
            computed: node.computed ? 1 : 0,
            generator: node.generator ? 1 : 0,
            async: node.async ? 1 : 0,
        };
    },
    ClassPrivateMethod(node) {
        return {
            kind: node.kind,
            static: node.static ? 1 : 0,
            computed: node.computed ? 1 : 0,
            generator: node.generator ? 1 : 0,
            async: node.async ? 1 : 0,
        };
    },
    ObjectMethod(node) {
        return {
            kind: node.kind,
            computed: node.computed ? 1 : 0,
            generator: node.generator ? 1 : 0,
            async: node.async ? 1 : 0,
        };
    },
    ObjectProperty(node) {
        return {
            computed: node.computed ? 1 : 0,
            method: node.method ? 1 : 0,
            shorthand: node.shorthand ? 1 : 0,
        };
    },
    ClassProperty(node) {
        return {
            static: node.static ? 1 : 0,
            computed: node.computed ? 1 : 0,
        };
    },
    ClassPrivateProperty(node) {
        return {
            static: node.static ? 1 : 0,
            computed: node.computed ? 1 : 0,
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
            prefix: node.prefix ? 1 : 0,
        };
    },
    UpdateExpression(node) {
        return {
            operator: node.operator,
            prefix: node.prefix ? 1 : 0,
        };
    },
    MemberExpression(node) {
        return {
            computed: node.computed ? 1 : 0,
        };
    },
    OptionalMemberExpression(node) {
        return {
            computed: node.computed ? 1 : 0,
        };
    },
    ForOfStatement(node) {
        return {
            is_await: node.await ? 1 : 0,
        };
    },
    YieldExpression(node) {
        return {
            delegate: node.delegate ? 1 : 0,
        };
    },
    ImportDeclaration(node) {
        return {
            source_value: node.source.value,
        };
    },
    JSXIdentifier(node) {
        return {
            name: node.name,
        };
    },
    JSXOpeningElement(node) {
        return {
            self_closing: node.selfClosing ? 1 : 0,
        };
    },
    JSXText(node) {
        return {
            value: node.value,
        };
    },
    CommentBlock(node) {
        return {
            value: node.value,
        };
    },
    CommentLine(node) {
        return {
            value: node.value,
        };
    },
    BigIntLiteral(node) {
        return {
            value: node.bigint,
        };
    },
    DecimalLiteral(node) {
        return {
            value: node.value,
        };
    },
    DirectiveLiteral(node) {
        return {
            value: node.value,
        };
    },
    InterpreterDirective(node) {
        return {
            value: node.value,
        };
    },
};

const writeNode = (db, node, file, parentId, parentType, parentField) => {
    if (!node || typeof node !== 'object' || !node.type)
        return null;
    
    const {type, loc} = node;
    const write = WRITERS[type];
    const extra = write ? write(node) : {};
    
    const id = insertNode(
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
                writeNode(db, child, file, id, type, key);
            
            continue;
        }
        
        if (val && typeof val === 'object' && val.type)
            writeNode(db, val, file, id, type, key);
    }
    
    return id;
};

export const writeAst = (db, ast, file) => writeNode(db, ast.program, file, null, null, null);

export const insertNode = (db, type, file, parentId, parentType, parentField, loc, extra) => {
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
    
    const valuePlaceholders = '?, ?, ?, ?, ?, ?, ?, ?';
    const extraPlaceholders = extraKeys
        .map(() => '?')
        .join(', ');
    const extraVals = !extraKeys.length ? '' : `, ${extraPlaceholders}`;
    
    for (const key of extraKeys)
        values.push(extra[key]);
    
    return db.insert(montag`
        INSERT INTO "${type}"
            (file, parent_id, parent_type, parent_field, start_line, start_col, end_line, end_col ${extraCols})
            VALUES (${valuePlaceholders} ${extraVals})
    `, values);
};
