// @ts-check

/** @type {import("prettier").Config} */
export default {
  plugins: [
    'prettier-plugin-sql',
    'prettier-plugin-packagejson',
    '@ianvs/prettier-plugin-sort-imports',
    'prettier-plugin-sort-json',
  ],
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  importOrder: [
    '^react$',
    '<BUILTIN_MODULES>', // Node.js built-in modules
    '^@tachybase/(.*)$',
    '^@tego/(.*)$',
    '',
    '<THIRD_PARTY_MODULES>', // Imports not matched by other special words or groups.
    '',
    '^[.]', // relative imports
  ],
  importOrderTypeScriptVersion: '5.6.3',
  importOrderParserPlugins: ['typescript', 'jsx', '["decorators", { "decoratorsBeforeExport": true }]'],
  overrides: [
    {
      files: '.prettierrc',
      options: {
        parser: 'json',
      },
    },
    {
      files: 'packages/**/locale/**/*.json',
      options: {
        parser: 'json',
        plugins: ['prettier-plugin-sort-json'],
        // 字母按字典顺序排序
        jsonSortOrder: '{ "/^[^\\\\d+]/": "lexical", "/^\\\\d+/": "numeric" }',
      },
    },
    {
      files: '*.sql',
      options: {
        language: 'postgresql',
        parser: 'sql',
        keywordCase: 'upper',
        paramTypes: JSON.stringify({
          custom: [{ regex: String.raw`\$\{[a-zA-Z0-9_]+\}|:[a-zA-Z0-9_]+` }],
        }),
        formatter: 'sql-formatter',
      },
    },
  ],
};
