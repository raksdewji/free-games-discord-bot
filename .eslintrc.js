module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    quotes: [2, 'single'],
    semi: [2, 'always']
  },
  plugins: ['only-warn']
};
