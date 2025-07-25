module.exports = {
  root: true,
  env: {
    node: true
  },
  // parser: "@typescript-eslint/parser",
  // plugins: [
  //   "@typescript-eslint"
  // ],
  extends: [
    "plugin:vue/essential",
    "@vue/standard",
    "@vue/typescript"
    // "eslint:recommended",
    // "plugin:@typescript-eslint/eslint-recommended",
    // "plugin:@typescript-eslint/recommended"
  ],
  // http://eslint.cn/docs/rules
  rules: {
    "no-console": "off", // 3D渲染项目需要console调试
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    indent: ["warn", 2, {
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1,
      MemberExpression: 1,
      ignoreComments: false,
      ObjectExpression: 1,
      ImportDeclaration: 1,
      flatTernaryExpressions: false,
      FunctionDeclaration: {
        parameters: 1,
        body: 1
      }
    }],
    quotes: ["warn", "double"],
    "comma-dangle": ["warn", "never"],
    semi: ["warn", "always", { omitLastInOneLineBlock: true }],
    "space-before-function-paren": ["warn", "never"]
  },
  parserOptions: {
    parser: "@typescript-eslint/parser"
  },
  overrides: [
    {
      files: [
        "**/__tests__/*.{j,t}s?(x)",
        "**/tests/unit/**/*.spec.{j,t}s?(x)"
      ],
      env: {
        jest: true
      }
    }
  ]
};
