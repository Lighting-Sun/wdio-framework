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

    {
        // Element access lives in the two action modules so every interaction
        // carries its locator description into failure messages and Allure steps.
        files: ['tests/**/*.ts'],
        ignores: ['tests/utils/elementActions.utils.ts', 'tests/utils/elementExpectations.utils.ts'],
        rules: {
            'no-restricted-globals': [
                'error',
                ...['$', '$$'].map((name) => ({
                    name,
                    message:
                        'Use the functions in tests/utils/elementActions.utils.ts or elementExpectations.utils.ts.',
                })),
            ],
        },
    },

    {
        // Every Allure call goes through report.utils.ts, so steps keep one
        // shape (opened before the action, failed on a throw) and one place to change.
        files: ['tests/**/*.ts'],
        ignores: ['tests/utils/report.utils.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    name: '@wdio/allure-reporter',
                    message: 'Use step() from tests/utils/report.utils.ts.',
                },
            ],
        },
    },

    // Must stay last: turns off every rule that would fight Prettier.
    prettier,
);
