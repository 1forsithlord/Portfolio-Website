// ESLint flat config. Type-aware rules are off on purpose: astro check already type-checks the project.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/", ".astro/", "node_modules/", "legacy/", "public/", "src/content/github.generated.json"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  // React islands: hooks rules. Only the .tsx files use React.
  {
    files: ["**/*.{ts,tsx}"],
    ...reactHooks.configs.flat["recommended-latest"],
  },

  // Build scripts run in Node, not in the browser.
  {
    files: ["scripts/**/*.mjs", "*.config.mjs", "eslint.config.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    // ProjectCarousel reads `index` inside two effects on purpose: they run only when `mode` changes,
    // so scrolling never steals focus or re-centres the track. Reviewed; keep in sync with the component.
    files: ["src/components/islands/ProjectCarousel.tsx"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },

  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
);
