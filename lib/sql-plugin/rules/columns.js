export const createHasColumn = (name) => (__args) => {
    for (const arg of __args) {
        if (arg.name === name)
            return true;
    }
    
    return false;
};

export const hasIdColumn = createHasColumn('id');
export const hasStartLineColumn = createHasColumn('start_line');
