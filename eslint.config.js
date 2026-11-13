import {safeAlign} from 'eslint-plugin-putout';
import {matchToFlat} from '@putout/eslint-flat';
import {defineConfig} from 'eslint/config';

export const match = {
    // node:sqlite is a release candidate since v24.15, eslint-plugin-n still marks it experimental
    '**/lib/db/sqlite.js': {
        'n/no-unsupported-features/node-builtins': ['error', {
            ignores: ['sqlite'],
        }],
    },
    '**/plugins/**/*.js': {
        'no-undef': 'off',
    },
};

export default defineConfig([safeAlign, matchToFlat(match)]);
