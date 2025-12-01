module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module"
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-useless-escape": "off",
    "react/no-unknown-property": "off",
    "react/no-unescaped-entities": "off",
    "@typescript-eslint/no-var-requires": "off"
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    "coverage/",
    "apps/api/dist/**"
  ],
  overrides: [
    {
      files: ["apps/web/**/*.{ts,tsx}", "apps/web/**/*.{js,jsx}"],
      env: {
        browser: true,
        es2021: true
      },
      plugins: ["react", "@next/next"],
      extends: [
        "plugin:react/recommended",
        "plugin:@next/next/recommended"
      ],
      settings: {
        react: {
          version: "detect"
        }
      },
      rules: {
        "react/react-in-jsx-scope": "off",
        "react/jsx-uses-react": "off",
        "@next/next/no-html-link-for-pages": "off",
        "react/no-unknown-property": "off",
        "react/no-unescaped-entities": "off"
      }
    },
    {
      files: ["apps/api/**/*.{ts,tsx}", "apps/worker/**/*.{ts,tsx}"],
      env: {
        node: true,
        es2021: true
      }
    }
  ]
};
