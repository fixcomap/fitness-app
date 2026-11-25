// Lint de la app (Expo + TypeScript). Lo ejecuta el pipeline estándar con `npm run lint`.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
]);
