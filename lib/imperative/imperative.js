import {parse, types} from '@putout/babel';

const {
    identifier,
    stringLiteral,
    arrayExpression,
    callExpression,
    assignmentExpression,
} = types;

const isInsertCall = (node) => node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'insert';

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
            
            const {name} = declarator.id;
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

const compile = (node) => {
    const ops = [];
    const bindings = new Set();
    
    for (const stmt of node.body)
        compileStatement(stmt, ops, bindings);
    
    return {
        ops,
        bindings,
    };
};

const getRefBindings = (fields) => {
    const refs = [];
    
    for (const field of fields) {
        if (field.value.type === 'ref')
            refs.push(field.value.binding);
    }
    
    return refs;
};

const hasRefs = (fields) => getRefBindings(fields).length > 0;

const isReferenced = (ops, index) => {
    const {binding} = ops[index];
    
    for (let i = index + 1; i < ops.length; i++) {
        if (getRefBindings(ops[i].fields).includes(binding))
            return true;
    }
    
    return false;
};

const toIdentifier = identifier;

const toParam = (name) => stringLiteral(`:${name}`);

const astFieldValue = (value) => {
    if (value.type === 'input')
        return toParam(value.name);
    
    if (value.type === 'literal')
        return stringLiteral(value.value);
    
    return null;
};

const astColumns = (fields) => {
    return arrayExpression(fields.map((field) => toIdentifier(field.name)));
};

const astValues = (fields) => {
    const args = fields
        .map((field) => field.value)
        .map(astFieldValue)
        .filter(Boolean);
    
    return callExpression(identifier('values'), args);
};

const astInsertArgs = (fields) => {
    const refs = getRefBindings(fields);
    
    if (refs.length)
        return callExpression(identifier('select'), [
            ...fields
                .map((field) => field.value)
                .map(astFieldValue)
                .filter(Boolean),
            toIdentifier('id'),
            callExpression(identifier('from'), [
                toIdentifier(refs[0]),
            ]),
        ]);
    
    return astValues(fields);
};

export const astInsert = (op, returning = false) => {
    const source = astInsertArgs(op.fields);
    const args = [
        callExpression(identifier('into'), [
            toIdentifier(op.tableName),
            astColumns(op.fields),
            source,
        ]),
    ];
    
    if (returning)
        args.push(callExpression(identifier('returning'), [
            toIdentifier('id'),
        ]));
    
    return callExpression(identifier('insert'), args);
};

const astAssignment = (op, returning) => {
    return assignmentExpression('=', identifier(op.binding), astInsert(op, returning));
};

const astWithNamed = (ops) => {
    const chain = [];
    const last = ops.length - 1;
    
    for (let i = 0; i < last; i++) {
        const op = ops[i];
        const returning = isReferenced(ops, i);
        
        chain.push(astAssignment(op, returning));
    }
    
    chain.push(astInsert(ops[last], false));
    
    return callExpression(identifier('withNamed'), chain);
};

export const imperativeToAst = (node) => {
    const {ops} = compile(node);
    const withRefs = ops.some((op) => hasRefs(op.fields));
    
    if (!withRefs) {
        const exprs = [];
        
        for (const op of ops) {
            exprs.push(astInsert(op, false));
        }
        
        return exprs.length === 1 ? exprs[0] : arrayExpression(exprs);
    }
    
    return astWithNamed(ops);
};

const emitStringFieldValue = (value) => {
    if (value.type === 'input')
        return `':${value.name}'`;
    
    if (value.type === 'literal')
        return `'${value.value}'`;
    
    return null;
};

const stringify = (fields) => {
    const values = fields
        .map((field) => field.value)
        .map(emitStringFieldValue)
        .filter(Boolean);
    
    return values.join(', ');
};

const stringifyInsert = (op, returning = false) => {
    const refs = getRefBindings(op.fields);
    const source = refs.length ? `select(${stringify(op.fields)}, id, from(${refs[0]}))` : `values(${stringify(op.fields)})`;
    
    const columns = `[${op.fields
        .map((field) => field.name)
        .join(', ')}]`;
    
    return `insert(into(${op.tableName}, ${columns}, ${source})${returning ? ', returning(id)' : ''})`;
};

const stringifyWithNamed = (ops) => {
    const last = ops.length - 1;
    const chain = [];
    
    for (let i = 0; i < last; i++)
        chain.push(`${ops[i].binding} = ${stringifyInsert(ops[i], isReferenced(ops, i))}`);
    
    chain.push(stringifyInsert(ops[last], false));
    
    return `withNamed(${chain.join(', ')})`;
};

export const convertImperative = (source) => {
    const {program} = parse(source);
    const {ops} = compile(program);
    const withRefs = ops.some((op) => hasRefs(op.fields));
    
    if (!withRefs) {
        const exprs = [];
        
        for (const op of ops) {
            exprs.push(stringifyInsert(op, false));
        }
        
        if (exprs.length === 1)
            return exprs[0];
        
        return `[${exprs.join(', ')}]`;
    }
    
    return stringifyWithNamed(ops);
};
