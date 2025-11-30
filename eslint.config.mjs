import nextPlugin from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'code-review/**',
      'oldstuff/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '.obsidian/**',
      'public/js/**',
    ],
  },
  ...nextPlugin,
];

export default eslintConfig;
