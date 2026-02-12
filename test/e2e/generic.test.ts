import { ensureDir, writeJson } from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { packageManagers } from "../../src/index.js";

describe("End to end tests - generic pak features", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-generic");
		await promisify(rimraf)(testDir);
		await ensureDir(testDir);
	});

	afterEach(async () => {
		await promisify(rimraf)(testDir);
	});

	it("workspaces() -> returns an empty array if the package.json does not contain the workspaces field", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

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
		await writeJson(packageJsonPath, packageJson);

		// Create directories for the workspaces
		await ensureDir(path.join(testDir, "packages", "package-a"));
		await ensureDir(path.join(testDir, "packages", "package-b"));
		await ensureDir(path.join(testDir, "packages", "package-c"));
		// Create package.json in workspace dirs
		await writeJson(
			path.join(testDir, "packages", "package-a", "package.json"),
			{},
		);
		await writeJson(
			path.join(testDir, "packages", "package-b", "package.json"),
			{},
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
