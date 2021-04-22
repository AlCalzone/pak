module.exports = {
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/test"],
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	setupFilesAfterEnv: ["jest-extended"],
	collectCoverage: false,
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
	coverageReporters: ["lcov", "html", "text-summary"],
	transform: {
		"^.+\\.tsx?$": "babel-jest",
	},
};
