export const READERS = {
    Identifier(entry) {
        return {
            name: entry.identifier_name,
        };
    },
    StringLiteral(entry) {
        return {
            value: entry.string_value,
        };
    },
    NumericLiteral(entry) {
        return {
            value: Number(entry.numeric_value),
        };
    },
    BooleanLiteral(entry) {
        return {
            value: entry.boolean_value,
        };
    },
    NullLiteral() {
        return {};
    },
    RegExpLiteral(entry) {
        return {
            pattern: entry.regexp_pattern,
            flags: entry.regexp_flags,
        };
    },
    BigIntLiteral(entry) {
        return {
            bigint: entry.bigint_value,
        };
    },
    DecimalLiteral(entry) {
        return {
            value: entry.decimal_value,
        };
    },
    TemplateElement(entry) {
        return {
            value: {
                cooked: entry.template_cooked,
                raw: entry.template_raw,
            },
            tail: entry.template_tail,
        };
    },
    DirectiveLiteral(entry) {
        return {
            value: entry.directive_value,
        };
    },
    InterpreterDirective(entry) {
        return {
            value: entry.interpreter_value,
        };
    },
    VariableDeclaration(entry) {
        return {
            kind: entry.declaration_kind,
        };
    },
    Program(entry) {
        return {
            sourceType: entry.program_source_type || 'module',
        };
    },
    FunctionDeclaration(entry) {
        return {
            generator: entry.function_generator,
            async: entry.function_async,
        };
    },
    FunctionExpression(entry) {
        return {
            generator: entry.function_generator,
            async: entry.function_async,
        };
    },
    ArrowFunctionExpression(entry) {
        return {
            generator: entry.arrow_generator,
            async: entry.arrow_async,
        };
    },
    ClassMethod(entry) {
        return {
            kind: entry.class_method_kind,
            static: entry.class_method_static,
            computed: entry.class_method_computed,
            generator: entry.class_method_generator,
            async: entry.class_method_async,
        };
    },
    ClassPrivateMethod(entry) {
        return {
            kind: entry.class_private_method_kind,
            static: entry.class_private_method_static,
            computed: entry.class_private_method_computed,
            generator: entry.class_private_method_generator,
            async: entry.class_private_method_async,
        };
    },
    ObjectMethod(entry) {
        return {
            kind: entry.object_method_kind,
            computed: entry.object_method_computed,
            generator: entry.object_method_generator,
            async: entry.object_method_async,
        };
    },
    ObjectProperty(entry) {
        return {
            computed: entry.object_property_computed,
            method: entry.object_property_method,
            shorthand: entry.object_property_shorthand,
        };
    },
    ClassProperty(entry) {
        return {
            static: entry.class_property_static,
            computed: entry.class_property_computed,
        };
    },
    ClassPrivateProperty(entry) {
        return {
            static: entry.class_private_property_static,
            computed: entry.class_private_property_computed,
        };
    },
    AssignmentExpression(entry) {
        return {
            operator: entry.assignment_operator,
        };
    },
    BinaryExpression(entry) {
        return {
            operator: entry.binary_operator,
        };
    },
    LogicalExpression(entry) {
        return {
            operator: entry.logical_operator,
        };
    },
    UnaryExpression(entry) {
        return {
            operator: entry.unary_operator,
            prefix: entry.unary_prefix,
        };
    },
    UpdateExpression(entry) {
        return {
            operator: entry.update_operator,
            prefix: entry.update_prefix,
        };
    },
    MemberExpression(entry) {
        return {
            computed: entry.member_computed,
        };
    },
    OptionalMemberExpression(entry) {
        return {
            computed: entry.optional_member_computed,
        };
    },
    ForOfStatement(entry) {
        return {
            await: entry.for_of_is_await,
        };
    },
    YieldExpression(entry) {
        return {
            delegate: entry.yield_delegate,
        };
    },
    ImportDeclaration(entry) {
        return {
            source: {
                value: entry.import_source_value,
            },
        };
    },
    JSXIdentifier(entry) {
        return {
            name: entry.jsx_identifier_name,
        };
    },
    JSXOpeningElement(entry) {
        return {
            selfClosing: entry.jsx_opening_self_closing,
        };
    },
    JSXText(entry) {
        return {
            value: entry.jsx_text_value,
        };
    },
    CommentBlock(entry) {
        return {
            value: entry.comment_block_value,
        };
    },
    CommentLine(entry) {
        return {
            value: entry.comment_line_value,
        };
    },
};
