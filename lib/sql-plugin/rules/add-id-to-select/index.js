import {hasIdColumn} from '../columns.js';

const not = (fn) => (...args) => !fn(...args);

export const report = () => 'Add "id" as first column to @select';

export const match = () => ({
    [`section('@select', select(__args))`]: not(hasIdColumn),
});

export const replace = () => ({
    [`section('@select', select(__args))`]: `section('@select', select(id, __args))`,
});
