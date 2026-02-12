import eslint from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["build/"],
	},

	eslint.configs.recommended,
	...tseslint.configs.recommended,

	{
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: "module",
				project: "./tsconfig.json",
			},
		},
		rules: {
			"@typescript-eslint/no-parameter-properties": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-use-before-define": [
				"error",
				{
					functions: false,
					typedefs: false,
					classes: false,
				},
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					ignoreRestSiblings: true,
					argsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-object-literal-type-assertion": "off",
			"@typescript-eslint/interface-name-prefix": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-inferrable-types": [
				"error",
				{
					ignoreProperties: true,
					ignoreParameters: true,
				},
			],
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": false,
					"ts-ignore": true,
					"ts-nocheck": true,
					"ts-check": false,
				},
			],
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: true,
					allowNullish: true,
				},
			],
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: false,
				},
			],
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-implied-eval": "off",
			"@typescript-eslint/explicit-module-boundary-types": [
				"warn",
				{ allowArgumentsExplicitlyTypedAsAny: true },
			],
			"@typescript-eslint/no-this-alias": "off",
		},
	},

	{
		files: ["**/*.test.ts"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/unbound-method": "warn",
		},
	},

	{
		files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
		...tseslint.configs.disableTypeChecked,
	},

	prettier,
);
