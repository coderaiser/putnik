export const fix = () => {
    const call = insert(CallExpression, {file, parent_id})
    insert(MemberExpression, {file, parent_id: call.id})
};