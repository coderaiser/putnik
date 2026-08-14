[
    insert(into(CallExpression, parent_id, values(':parent_id')), lastInsertRowid()),
    lastval(),
];
