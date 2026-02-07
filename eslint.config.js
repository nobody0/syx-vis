import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, d3: "readonly" }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
      "no-undef": "error",
      "eqeqeq": ["warn", "smart"],
      "no-implicit-coercion": ["warn", { allow: ["!!"] }],
      "no-shadow": "warn"
    }
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  { ignores: ["data/*.js"] }
];
