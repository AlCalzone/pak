import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { rimraf } from "rimraf";
import { packageManagers } from "../../src/index.js";

describe("End to end tests - generic pak features", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-generic");
		await rimraf(testDir);
		await fs.mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rimraf(testDir);
	});

	it("workspaces() -> returns an empty array if the package.json does not contain the workspaces field", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const npm = new packageManagers.npm();
		npm.cwd = testDir;
		await expect(npm.findRoot()).resolves.toBe(testDir);

		await expect(npm.workspaces()).resolves.toEqual([]);
	}, 60000);

	it("workspaces() -> returns an array with all directories in the workspaces field which contain a package.json", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
			workspaces: ["packages/*", "does-not-exist"],
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		// Create directories for the workspaces
		await fs.mkdir(path.join(testDir, "packages", "package-a"), { recursive: true });
		await fs.mkdir(path.join(testDir, "packages", "package-b"), { recursive: true });
		await fs.mkdir(path.join(testDir, "packages", "package-c"), { recursive: true });
		// Create package.json in workspace dirs
		await fs.writeFile(
			path.join(testDir, "packages", "package-a", "package.json"),
			JSON.stringify({}),
		);
		await fs.writeFile(
			path.join(testDir, "packages", "package-b", "package.json"),
			JSON.stringify({}),
		);
		// No package.json in package-c -> no workspace

		const npm = new packageManagers.npm();
		npm.cwd = testDir;
		await expect(npm.findRoot()).resolves.toBe(testDir);

		await expect(npm.workspaces()).resolves.toEqual([
			path.join(testDir, "packages", "package-a"),
			path.join(testDir, "packages", "package-b"),
		]);
	}, 60000);
});
