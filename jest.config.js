module.exports = {
	testEnvironment: "node",
	testRunner: "jest-jasmine2", // https://github.com/jestjs/jest/issues/11698
	roots: ["<rootDir>/src", "<rootDir>/test"],
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	setupFilesAfterEnv: ["jest-extended/all"],
	collectCoverage: false,
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
	coverageReporters: ["lcov", "html", "text-summary"],
	transform: {
		"^.+\\.tsx?$": "babel-jest",
	},
};
