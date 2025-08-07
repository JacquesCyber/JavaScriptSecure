import security from "eslint-plugin-security";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      security
    },
    rules: {
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error", 
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "error",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error"
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    }
  }
];
