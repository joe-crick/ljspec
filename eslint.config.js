import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.vitest,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
      curly: ["error", "multi-line"],
      "sort-imports": "off",
      "sort-keys": "off",
      "no-magic-numbers": "off",
      "id-length": "off",
      "func-style": "off",
      "max-params": "off",
      "no-shadow": "off",
      "no-implicit-coercion": "off",
      "no-nested-ternary": "off",
      "func-names": "off",
      "prefer-template": "off",
    },
  },
];
