import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js: js, security: "eslint-plugin-security" },
    extends: ["js/recommended", "plugin:security/recommended"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-unsafe-regex": "warn"
    }
  },
]);