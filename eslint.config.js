// Shared ESLint config for every workspace package. ESLint looks up config from each
// linted file's directory, so `eslint .` inside any package resolves to this file.
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import astro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/dist/",
    "**/dist-e2e/",
    "**/.astro/",
    "**/.turbo/",
    "**/coverage/",
    "**/playwright-report/",
    "**/test-results/",
  ]),

  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  js.configs.recommended,

  // Every eslint-disable comment must say why (CLAUDE.md: no `any` without an explanation).
  comments.recommended,
  {
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },

  // Type-aware rules for TypeScript sources.
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // React components.
  {
    files: ["**/*.tsx"],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.configs.recommended],
  },

  // Astro components.
  astro.configs.recommended,
  astro.configs["jsx-a11y-recommended"],
  {
    files: ["**/*.astro"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Scripts inside .astro files are virtual files outside any tsconfig.
    files: ["**/*.astro/*.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
]);
