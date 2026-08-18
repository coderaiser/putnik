import {parse} from '@putout/babel';

const isInsertCall = (node) =>
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'insert';

const reject = (message) => {
    throw Error(message);
};

const getTableName = (node) => {
    const [table] = node.arguments;
    
    if (!table || table.type !== 'Identifier')
        throw Error('insert() expects a table identifier as first argument');
    
    return table.name;
};

const getObjectFields = (node) => {
    const [, fields] = node.arguments;
    
    if (!fields || fields.type !== 'ObjectExpression')
        reject('insert() expects an object of fields as second argument');
    
    return fields.properties;
};

const parseFieldValue = (node, bindings) => {
    if (node.type === 'Identifier')
        return {
            type: 'input',
            name: node.name,
        };
    
    if (node.type === 'StringLiteral')
        return {
            type: 'literal',
            value: node.value,
        };
    
    if (node.type === 'MemberExpression') {
        const {object, property} = node;
        
        if (object.type !== 'Identifier' || property.type !== 'Identifier')
            reject('Unsupported field reference');
        
        if (!bindings.has(object.name))
            reject(`unknown binding: ${object.name}`);
        
        return {
            type: 'ref',
            binding: object.name,
        };
    }
    
    reject('Unsupported field value');
};

const compileInsert = (init, bindings, binding = null) => {
    const tableName = getTableName(init);
    const fields = [];
    
    for (const prop of getObjectFields(init)) {
        const key = prop.key.name;
        const value = prop.shorthand ? {
            type: 'input',
            name: key,
        } : parseFieldValue(prop.value, bindings);
        
        fields.push({
            name: key,
            value,
        });
    }
    
    return {
        binding,
        tableName,
        fields,
    };
};

const compileStatement = (stmt, ops, bindings) => {
    if (stmt.type === 'VariableDeclaration') {
        if (stmt.kind !== 'const')
            reject(`const only: ${stmt.kind} is not allowed`);
        
        for (const declarator of stmt.declarations) {
            if (declarator.id.type !== 'Identifier')
                reject('Unsupported binding');
            
            if (!declarator.init || !isInsertCall(declarator.init))
                reject('Expected insert(Table, {fields}) statement');
            
            const name = declarator.id.name;
            const op = compileInsert(declarator.init, bindings, name);
            
            bindings.add(name);
            ops.push(op);
        }
        
        return;
    }
    
    if (stmt.type === 'ExpressionStatement') {
        if (stmt.expression.type === 'AssignmentExpression')
            reject('reassignment is not allowed');
        
        if (!isInsertCall(stmt.expression))
            reject('Expected insert(Table, {fields}) statement');
        
        ops.push(compileInsert(stmt.expression, bindings, null));
        return;
    }
    
    if (stmt.type === 'IfStatement')
        reject('if statements are not allowed');
    
    if (stmt.type === 'ForStatement')
        reject('for statements are not allowed');
    
    if (stmt.type === 'WhileStatement')
        reject('while statements are not allowed');
    
    reject(`Unsupported statement: ${stmt.type}`);
};

const emitFieldValue = (value) => {
    if (value.type === 'input')
        return `':${value.name}'`;
    
    if (value.type === 'literal')
        return `'${value.value}'`;
    
    return null;
};

const getColumns = (fields) => {
    return `[${fields.map((field) => field.name).join(', ')}]`;
};

const getValuesArgs = (fields) => {
    const values = fields.map((field) => field.value).map(emitFieldValue).filter(Boolean);
    
    return values.join(', ');
};

const getRefBindings = (fields) => {
    const refs = [];
    
    for (const field of fields) {
        if (field.value.type === 'ref')
            refs.push(field.value.binding);
    }
    
    return refs;
};

const getInsertArgs = (fields) => {
    const refs = getRefBindings(fields);
    
    if (refs.length)
        return `select(${getValuesArgs(fields)}, id, from(${refs[0]}))`;
    
    return `values(${getValuesArgs(fields)})`;
};

const emitInsert = (op, returning = false) => {
    const args = `into(${op.tableName}, ${getColumns(op.fields)}, ${getInsertArgs(op.fields)})`;
    
    return `insert(${args}${returning ? ', returning(id)' : ''})`;
};

const isReferenced = (ops, index) => {
    const binding = ops[index].binding;
    
    for (let i = index + 1; i < ops.length; i++) {
        if (getRefBindings(ops[i].fields).includes(binding))
            return true;
    }
    
    return false;
};

const emitWithNamed = (ops) => {
    const chain = [];
    const last = ops.length - 1;
    
    for (let i = 0; i < last; i++) {
        const op = ops[i];
        const returning = isReferenced(ops, i);
        
        chain.push(`${op.binding} = ${emitInsert(op, returning)}`);
    }
    
    chain.push(emitInsert(ops[last], false));
    
    return `withNamed(${chain.join(', ')})`;
};

export const convertImperative = (source) => {
    const {program} = parse(source);
    const ops = [];
    const bindings = new Set();
    
    for (const stmt of program.body)
        compileStatement(stmt, ops, bindings);
    
    const hasDeps = ops.some((op) => getRefBindings(op.fields).length);
    
    if (!hasDeps) {
        const exprs = ops.map((op) => emitInsert(op, false));
        
        if (exprs.length === 1)
            return exprs[0];
        
        return `[${exprs.join(', ')}]`;
    }
    
    return emitWithNamed(ops);
};
