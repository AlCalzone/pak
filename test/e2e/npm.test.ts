import spawn from "nano-spawn";
import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { rimraf } from "rimraf";
import { packageManagers } from "../../src/index.js";
import semver from "semver";

describe("End to end tests - npm", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-npm");
		await rimraf(testDir);
		await fs.mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rimraf(testDir);
	});

	it("installs und uninstalls correctly", async () => {
		let packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const npm = new packageManagers.npm();
		npm.cwd = testDir;
		await expect(npm.findRoot()).resolves.toBe(testDir);

		await npm.install(["is-even@0.1.0"], { exact: true });
		await npm.install(["is-odd@3.0.0"], { dependencyType: "dev" });

		// Now that something is installed, there should be a package-lock.json
		await expect(npm.findRoot("package-lock.json")).resolves.toBe(testDir);

		packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
		expect(packageJson.dependencies["is-even"]).toBe("0.1.0");
		expect(packageJson.devDependencies["is-odd"]).toBe("3.0.0");

		await npm.uninstall(["is-even"]);
		await npm.uninstall(["is-odd"], { dependencyType: "dev" });
		packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

		expect(packageJson.dependencies ?? {}).not.toHaveProperty("is-even");
		expect(packageJson.devDependencies ?? {}).not.toHaveProperty("is-odd");
	}, 60000);

	it("overriding dependencies works", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		// is-even@1.0.0 includes is-odd@^0.1.2, which also has newer versions (1.0.0+)
		await npm.install(["is-even@1.0.0"]);
		let version = await spawn("node", ["-p", 'require("is-odd/package.json").version'], { cwd: testDir });
		expect(version.stdout).toMatch(/^0\./);

		const result = await npm.overrideDependencies({
			"is-odd": "1.0.0",
		});
		expect(result.success).toBe(true);

		version = await spawn("node", ["-p", 'require("is-odd/package.json").version'], { cwd: testDir });
		expect(version.stdout).toBe("1.0.0");

		version = await spawn("node", ["-p", 'require("is-odd/package.json").version'], {
			cwd: path.join(testDir, "node_modules/is-even"),
		});
		expect(version.stdout).toBe("1.0.0");
	}, 60000);

	it("does not install devDependencies, unless the environment is set to development", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
			devDependencies: {
				"is-odd": "3.0.0",
			},
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		await npm.install([]);
		// not found!
		await expect(
			spawn("node", ["-p", 'require("is-odd/package.json").version'], { cwd: testDir }),
		).rejects.toThrow();

		npm.environment = "development";
		await npm.install([]);
		const version = await spawn("node", ["-p", 'require("is-odd/package.json").version'], { cwd: testDir });
		// now it is
		expect(version.stdout).toBe("3.0.0");
	}, 60000);

	it("packs non-monorepo projects correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		const result = await npm.pack({
			targetDir: path.join(testDir, "foo/bar"),
		});
		// console.log(result.stdall);

		expect(result.stdout).toBe(
			path.join(testDir, "foo/bar/test-0.0.1.tgz"),
		);
		await expect(fs.access(result.stdout)).resolves.toBeUndefined();
	}, 60000);

	it("packs scoped non-monorepo projects correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "@scope/test",
			version: "0.0.1-beta.0+1234",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		const result = await npm.pack();
		// console.log(result.stdall);
		expect(result.stdout).toBe(
			path.join(testDir, "scope-test-0.0.1-beta.0+1234.tgz"),
		);
		await expect(fs.access(result.stdout)).resolves.toBeUndefined();
	}, 60000);

	it("packs monorepo workspaces correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
			workspaces: ["packages/*"],
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		// Create directories for the workspaces
		await fs.mkdir(path.join(testDir, "packages", "package-a"), { recursive: true });
		await fs.mkdir(path.join(testDir, "packages", "package-b"), { recursive: true });
		// Create package.json in workspace dirs
		await fs.writeFile(
			path.join(testDir, "packages", "package-a", "package.json"),
			JSON.stringify({ name: "@test/package-a", version: "0.0.1" }),
		);
		await fs.writeFile(
			path.join(testDir, "packages", "package-b", "package.json"),
			JSON.stringify({ name: "@test/package-b", version: "0.0.2" }),
		);

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		let result = await npm.pack({
			workspace: "packages/package-a",
		});
		if (semver.gte(await npm.version(), "7.0.0")) {
			expect(result.stdout).toBe(
				path.join(testDir, "test-package-a-0.0.1.tgz"),
			);
			await expect(fs.access(result.stdout)).resolves.toBeUndefined();

			result = await npm.pack({
				workspace: "packages/package-b",
			});
			expect(result.stdout).toBe(
				path.join(testDir, "test-package-b-0.0.2.tgz"),
			);
			await expect(fs.access(result.stdout)).resolves.toBeUndefined();
		} else {
			// npm 6 will fail
			expect(result.success).toBe(false);
			expect(result.stderr).toMatch(/does not support/);
		}
	}, 60000);
});
