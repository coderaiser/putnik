import {montag} from 'montag';

export const readRows = (db, file) => {
    const rows = db.all(montag`
        SELECT n.id,
               n.type,
               n.parent_id,
               n.parent_type,
               n.parent_field,
               n.start_line,
               n.start_col,
               n.end_line,
               n.end_col,
               i.name                    AS identifier_name,
               sl.value                  AS string_value,
               nl.value                  AS numeric_value,
               bl.value                  AS boolean_value,
               rl.pattern                AS regexp_pattern,
               rl.flags                  AS regexp_flags,
               vd.kind                   AS declaration_kind,
               p.source_type             AS program_source_type,
               fd.generator              AS function_generator,
               fd.async                  AS function_async,
               af.generator              AS arrow_generator,
               af.async                  AS arrow_async,
               unary_expression.prefix   AS unary_prefix,
               unary_expression.operator AS unary_operator
        FROM file_nodes n
                 LEFT JOIN Identifier i ON i.id = n.id AND n.type = 'Identifier'
                 LEFT JOIN StringLiteral sl ON sl.id = n.id AND n.type = 'StringLiteral'
                 LEFT JOIN NumericLiteral nl ON nl.id = n.id AND n.type = 'NumericLiteral'
                 LEFT JOIN BooleanLiteral bl ON bl.id = n.id AND n.type = 'BooleanLiteral'
                 LEFT JOIN RegExpLiteral rl ON rl.id = n.id AND n.type = 'RegExpLiteral'
                 LEFT JOIN VariableDeclaration vd ON vd.id = n.id AND n.type = 'VariableDeclaration'
                 LEFT JOIN Program p ON p.id = n.id AND n.type = 'Program'
                 LEFT JOIN FunctionDeclaration fd ON fd.id = n.id AND n.type = 'FunctionDeclaration'
                 LEFT JOIN ArrowFunctionExpression af ON af.id = n.id AND n.type = 'ArrowFunctionExpression'
                 LEFT JOIN UnaryExpression unary_expression ON unary_expression.id = n.id AND n.type = 'UnaryExpression'
        WHERE n.file = ?
    `, [file]);
    
    return rows;
};
