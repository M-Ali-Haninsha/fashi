const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  // public/ is browser code (mostly third-party libraries), checked separately if at all.
  { ignores: ["node_modules/", "public/"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: "commonjs", globals: globals.node },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^(req|res|next)$" }] },
  },
];
