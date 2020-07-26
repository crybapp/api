module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  'globals': {
    'Atomics': 'readonly',
    'SharedArrayBuffer': 'readonly'
  },
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 2018,
    'sourceType': 'module'
  },
  'plugins': [
    '@typescript-eslint'
  ],
  'rules': {
    'indent': [
      'error',
      2
    ],
    '@typescript-eslint/no-explicit-any': [
      'off'
    ],
    '@typescript-eslint/explicit-module-boundary-types': [
      'off'
    ],
    'prefer-const': [
      'error'
    ],
    'nonblock-statement-body-position': [
      'error', 'below'
    ],
    'no-sequences': [
      'error'
    ],
    'eol-last': [
      'error', 'always'
    ],
    'one-var': [
      'error', 'never'
    ],
    'one-var-declaration-per-line': [
      'error', 'always'
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'never'
    ]
  }
}
