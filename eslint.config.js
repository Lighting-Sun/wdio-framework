import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import wdio from 'eslint-plugin-wdio';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        // Generated output and dependencies are never linted.
        ignores: ['node_modules/**', 'reports/**', 'tmp/**', '*.d.ts'],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['**/*.ts'],
        languageOptions: {
            // `recommended` is not type-aware. The three rules below that need type
            // information (no-floating-promises, await-thenable, require-await) only work
            // with the project service switched on. Full `recommendedTypeChecked` is
            // deliberately not used — it is far noisier than this codebase needs today.
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            /**
             * A bulk rename once left a parameter and a local both named
             * `element` in the same function. `tsc` caught it; a reader would
             * plausibly not have. This rule catches that class directly.
             */
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': 'error',

            /**
             * Every browser interaction is async. A dropped `await` produces a
             * test that passes without asserting anything, which is the worst
             * failure mode an automation framework has.
             */
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            'require-await': 'off',
            '@typescript-eslint/require-await': 'error',

            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },

    {
        // wdio's own rules catch `await expect(await ...)`, which
        // discards the auto-retrying assertion and reintroduces the race it exists to prevent.
        // The plugin's rule keys are already namespaced, so its config is spread whole
        // rather than cherry-picked.
        ...wdio.configs['flat/recommended'],
        files: ['tests/**/*.ts'],
    },

    // Must stay last: turns off every rule that would fight Prettier.
    prettier,
);
