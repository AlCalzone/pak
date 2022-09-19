import execa from "execa";
import { ensureDir, readJson, writeJson } from "fs-extra";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import fs from "fs-extra";
import { promisify } from "util";
import { packageManagers } from "../../src/index";
import semver from "semver";

describe("End to end tests - npm", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-npm");
		await promisify(rimraf)(testDir);
		await ensureDir(testDir);
	});

	afterEach(async () => {
		await promisify(rimraf)(testDir);
	});

	it("installs und uninstalls correctly", async () => {
		let packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const npm = new packageManagers.npm();
		npm.cwd = testDir;
		await expect(npm.findRoot()).resolves.toBe(testDir);

		await npm.install(["is-even@0.1.0"], { exact: true });
		await npm.install(["is-odd@3.0.0"], { dependencyType: "dev" });

		// Now that something is installed, there should be a package-lock.json
		await expect(npm.findRoot("package-lock.json")).resolves.toBe(testDir);

		packageJson = await readJson(packageJsonPath);
		expect(packageJson.dependencies["is-even"]).toBe("0.1.0");
		expect(packageJson.devDependencies["is-odd"]).toBe("3.0.0");

		await npm.uninstall(["is-even"]);
		await npm.uninstall(["is-odd"], { dependencyType: "dev" });
		packageJson = await readJson(packageJsonPath);

		expect(packageJson.dependencies ?? {}).not.toHaveProperty("is-even");
		expect(packageJson.devDependencies ?? {}).not.toHaveProperty("is-odd");
	}, 60000);

	it("overriding dependencies works", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		// is-even@1.0.0 includes is-odd@^0.1.2, which also has newer versions (1.0.0+)
		await npm.install(["is-even@1.0.0"]);
		let version = await execa.command(
			'node -p require("is-odd/package.json").version',
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		expect(version.stdout).toMatch(/^0\./);

		const result = await npm.overrideDependencies({
			"is-odd": "1.0.0",
		});
		expect(result.success).toBe(true);

		debugger;

		version = await execa.command(
			'node -p require("is-odd/package.json").version',
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		expect(version.stdout).toBe("1.0.0");

		version = await execa.command(
			'node -p require("is-odd/package.json").version',
			{
				cwd: path.join(testDir, "node_modules/is-even"),
				reject: false,
				encoding: "utf8",
			},
		);
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
		await writeJson(packageJsonPath, packageJson);

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		await npm.install([]);
		let version = await execa.command(
			'node -p require("is-odd/package.json").version',
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		// not found!
		expect(version.stdout).toBe("");

		npm.environment = "development";
		await npm.install([]);
		version = await execa.command(
			'node -p require("is-odd/package.json").version',
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		// now it is
		expect(version.stdout).toBe("3.0.0");
	}, 60000);

	it("packs non-monorepo projects correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		const result = await npm.pack({
			targetDir: path.join(testDir, "foo/bar"),
		});
		console.log(result.stdall);

		expect(result.stdout).toBe(
			path.join(testDir, "foo/bar/test-0.0.1.tgz"),
		);
		expect(fs.pathExists(result.stdout)).resolves.toBe(true);
	}, 60000);

	it("packs scoped non-monorepo projects correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "@scope/test",
			version: "0.0.1-beta.0+1234",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const npm = new packageManagers.npm();
		npm.cwd = testDir;

		const result = await npm.pack();
		console.log(result.stdall);
		expect(result.stdout).toBe(
			path.join(testDir, "scope-test-0.0.1-beta.0+1234.tgz"),
		);
		expect(fs.pathExists(result.stdout)).resolves.toBe(true);
	}, 60000);

	it("packs monorepo workspaces correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
			workspaces: ["packages/*"],
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		// Create directories for the workspaces
		await ensureDir(path.join(testDir, "packages", "package-a"));
		await ensureDir(path.join(testDir, "packages", "package-b"));
		// Create package.json in workspace dirs
		await writeJson(
			path.join(testDir, "packages", "package-a", "package.json"),
			{ name: "@test/package-a", version: "0.0.1" },
		);
		await writeJson(
			path.join(testDir, "packages", "package-b", "package.json"),
			{ name: "@test/package-b", version: "0.0.2" },
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
			expect(fs.pathExists(result.stdout)).resolves.toBe(true);

			result = await npm.pack({
				workspace: "packages/package-b",
			});
			expect(result.stdout).toBe(
				path.join(testDir, "test-package-b-0.0.2.tgz"),
			);
			expect(fs.pathExists(result.stdout)).resolves.toBe(true);
		} else {
			// npm 6 will fail
			expect(result.success).toBe(false);
			expect(result.stderr).toMatch(/does not support/);
		}
	}, 60000);
});
