import {montag} from 'montag';

const ARRAY_FIELDS = new Set([
    'body',
    'declarations',
    'elements',
    'properties',
    'params',
    'arguments',
    'specifiers',
    'members',
    'expressions',
    'decorators',
    'directives',
]);

const READERS = {
    Identifier(entry) {
        return {name: entry.identifier_name};
    },
    StringLiteral(entry) {
        return {value: entry.string_value};
    },
    NumericLiteral(entry) {
        return {value: Number(entry.numeric_value)};
    },
    BooleanLiteral(entry) {
        return {value: entry.boolean_value};
    },
    NullLiteral() {
        return {};
    },
    RegExpLiteral(entry) {
        return {pattern: entry.regexp_pattern, flags: entry.regexp_flags};
    },
    BigIntLiteral(entry) {
        return {bigint: entry.bigint_value};
    },
    DecimalLiteral(entry) {
        return {value: entry.decimal_value};
    },
    TemplateElement(entry) {
        return {value: {cooked: entry.template_cooked, raw: entry.template_raw}, tail: entry.template_tail};
    },
    DirectiveLiteral(entry) {
        return {value: entry.directive_value};
    },
    InterpreterDirective(entry) {
        return {value: entry.interpreter_value};
    },
    VariableDeclaration(entry) {
        return {kind: entry.declaration_kind};
    },
    Program(entry) {
        return {sourceType: entry.program_source_type || 'module'};
    },
    FunctionDeclaration(entry) {
        return {generator: entry.function_generator, async: entry.function_async};
    },
    FunctionExpression(entry) {
        return {generator: entry.function_generator, async: entry.function_async};
    },
    ArrowFunctionExpression(entry) {
        return {generator: entry.arrow_generator, async: entry.arrow_async};
    },
    ClassMethod(entry) {
        return {kind: entry.class_method_kind, static: entry.class_method_static, computed: entry.class_method_computed, generator: entry.class_method_generator, async: entry.class_method_async};
    },
    ClassPrivateMethod(entry) {
        return {kind: entry.class_private_method_kind, static: entry.class_private_method_static, computed: entry.class_private_method_computed, generator: entry.class_private_method_generator, async: entry.class_private_method_async};
    },
    ObjectMethod(entry) {
        return {kind: entry.object_method_kind, computed: entry.object_method_computed, generator: entry.object_method_generator, async: entry.object_method_async};
    },
    ObjectProperty(entry) {
        return {computed: entry.object_property_computed, method: entry.object_property_method, shorthand: entry.object_property_shorthand};
    },
    ClassProperty(entry) {
        return {static: entry.class_property_static, computed: entry.class_property_computed};
    },
    ClassPrivateProperty(entry) {
        return {static: entry.class_private_property_static, computed: entry.class_private_property_computed};
    },
    AssignmentExpression(entry) {
        return {operator: entry.assignment_operator};
    },
    BinaryExpression(entry) {
        return {operator: entry.binary_operator};
    },
    LogicalExpression(entry) {
        return {operator: entry.logical_operator};
    },
    UnaryExpression(entry) {
        return {operator: entry.unary_operator, prefix: entry.unary_prefix};
    },
    UpdateExpression(entry) {
        return {operator: entry.update_operator, prefix: entry.update_prefix};
    },
    MemberExpression(entry) {
        return {computed: entry.member_computed};
    },
    OptionalMemberExpression(entry) {
        return {computed: entry.optional_member_computed};
    },
    ForOfStatement(entry) {
        return {await: entry.for_of_is_await};
    },
    YieldExpression(entry) {
        return {delegate: entry.yield_delegate};
    },
    ImportDeclaration(entry) {
        return {source: {value: entry.import_source_value}};
    },
    JSXIdentifier(entry) {
        return {name: entry.jsx_identifier_name};
    },
    JSXOpeningElement(entry) {
        return {selfClosing: entry.jsx_opening_self_closing};
    },
    JSXText(entry) {
        return {value: entry.jsx_text_value};
    },
    CommentBlock(entry) {
        return {value: entry.comment_block_value};
    },
    CommentLine(entry) {
        return {value: entry.comment_line_value};
    },
};

export const readAst = (db, file) => {
    const rows = db.all(montag`
        SELECT
            n.id, n.type, n.parent_id, n.parent_type, n.parent_field,
            n.start_line, n.start_col, n.end_line, n.end_col,
            i.name                 AS identifier_name,
            sl.value               AS string_value,
            nl.value               AS numeric_value,
            bl.value               AS boolean_value,
            rl.pattern             AS regexp_pattern,
            rl.flags               AS regexp_flags,
            vd.kind                AS declaration_kind,
            p.source_type          AS program_source_type,
            fd.generator           AS function_generator,
            fd.async               AS function_async,
            af.generator           AS arrow_generator,
            af.async               AS arrow_async
        FROM file_nodes n
        LEFT JOIN Identifier                    i    ON i.id    = n.id AND n.type = 'Identifier'
        LEFT JOIN StringLiteral                 sl   ON sl.id   = n.id AND n.type = 'StringLiteral'
        LEFT JOIN NumericLiteral                nl   ON nl.id   = n.id AND n.type = 'NumericLiteral'
        LEFT JOIN BooleanLiteral                bl   ON bl.id   = n.id AND n.type = 'BooleanLiteral'
        LEFT JOIN RegExpLiteral                 rl   ON rl.id   = n.id AND n.type = 'RegExpLiteral'
        LEFT JOIN VariableDeclaration           vd   ON vd.id   = n.id AND n.type = 'VariableDeclaration'
        LEFT JOIN Program                       p    ON p.id    = n.id AND n.type = 'Program'
        LEFT JOIN FunctionDeclaration           fd   ON fd.id   = n.id AND n.type = 'FunctionDeclaration'
        LEFT JOIN ArrowFunctionExpression       af   ON af.id   = n.id AND n.type = 'ArrowFunctionExpression'
        WHERE n.file = ?
    `, [file]);
    
    if (!rows.length)
        return null;
    
    const nodeKey = (type, id) => `${type}:${id}`;
    const index = new Map();
    
    for (const row of rows)
        index.set(nodeKey(row.type, row.id), {
            ...row,
            _children: [],
        });
    
    let root = null;
    
    for (const row of rows) {
        if (row.parent_id === null) {
            root = index.get(nodeKey(row.type, row.id));
            continue;
        }
        
        const parent = index.get(nodeKey(row.parent_type, row.parent_id));
        
        if (parent)
            parent._children.push(row);
    }
    
    if (!root)
        return null;
    
    const build = (row) => {
        const entry = index.get(nodeKey(row.type, row.id));
        const read = READERS[row.type];
        const node = {
            type: row.type,
            ...(read ? read(entry) : {}),
        };
        
        const byField = new Map();
        
        for (const child of entry._children) {
            const {parent_field} = child;
            
            if (!byField.has(parent_field))
                byField.set(parent_field, []);
            
            byField.get(parent_field).push(child);
        }
        
        for (const [field, children] of byField) {
            const built = children.map(build);
            node[field] = ARRAY_FIELDS.has(field) ? built : built[0];
        }
        
        return node;
    };
    
    return {
        type: 'File',
        program: build(root),
    };
};
