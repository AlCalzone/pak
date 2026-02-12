import execa from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	copy,
	createFile,
	ensureDir,
	readJson,
	writeJson,
	pathExists,
	readdir,
} from "fs-extra";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { packageManagers } from "../../src/index.js";

describe("End to end tests - yarn berry", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-yarn-berry");
		await promisify(rimraf)(testDir);
		await ensureDir(testDir);
		// Upgrade it to yarn v3
		const templatesDir = path.join(__dirname, ".yarn-berry");
		for (const file of await readdir(templatesDir)) {
			const source = path.join(templatesDir, file);
			const target = path.join(testDir, file);
			await copy(source, target, { recursive: true });
		}
		// Create empty yarn.lock, or it will look further up the tree
		await createFile(path.join(testDir, "yarn.lock"));
		// Keep yarn from failing when changing the lockfile
		process.env.YARN_ENABLE_IMMUTABLE_INSTALLS = "0";
	});

	afterEach(async () => {
		await promisify(rimraf)(testDir);
	});

	it("is actually using yarn berry", async () => {
		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;
		await expect(yarn.version()).resolves.toBe("3.2.3");
	}, 60000);

	it("installs und uninstalls correctly", async () => {
		let packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;
		await expect(yarn.findRoot()).resolves.toBe(testDir);

		await yarn.install(["is-even@0.1.0"], { exact: true });
		await yarn.install(["is-odd@^3.0.0"], { dependencyType: "dev" });

		// Now that something is installed, there should be a yarn.lock
		await expect(yarn.findRoot("yarn.lock")).resolves.toBe(testDir);

		packageJson = await readJson(packageJsonPath);
		expect(packageJson.dependencies["is-even"]).toBe("0.1.0");
		expect(packageJson.devDependencies["is-odd"]).toBe("^3.0.0");

		await yarn.update(["is-odd"]); // there's at least a 3.0.1 to update to
		packageJson = await readJson(packageJsonPath);
		expect(packageJson.devDependencies["is-odd"]).not.toBe("^3.0.0");

		await yarn.uninstall(["is-even"]);
		await yarn.uninstall(["is-odd"], { dependencyType: "dev" });
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

		const yarn = new packageManagers.yarn();
		yarn.loglevel = "verbose";
		yarn.cwd = testDir;

		// is-even@1.0.0 includes is-odd@^0.1.2, which also has newer versions (1.0.0+)
		let result = await yarn.install(["is-even@1.0.0"]);
		expect(result.success).toBe(true);

		let version = await execa(
			"node",
			["-p", 'require("is-odd/package.json").version'],
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		expect(version.stdout).toMatch(/^0\./);

		result = await yarn.overrideDependencies({
			"is-odd": "1.0.0",
		});
		expect(result.success).toBe(true);

		version = await execa(
			"node",
			["-p", 'require("is-odd/package.json").version'],
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		expect(version.stdout).toBe("1.0.0");

		version = await execa(
			"node",
			["-p", 'require("is-odd/package.json").version'],
			{
				cwd: path.join(testDir, "node_modules/is-even"),
				reject: false,
				encoding: "utf8",
			},
		);
		expect(version.stdout).toBe("1.0.0");
	}, 60000);

	// Yarn berry does not support the --production flag
	it.skip("does not install devDependencies, unless the environment is set to development", async () => {
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
			devDependencies: {
				"is-odd": "3.0.0",
			},
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		await yarn.install([]);
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

		yarn.environment = "development";
		await yarn.install([]);
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

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		const result = await yarn.pack({
			targetDir: path.join(testDir, "foo/bar"),
		});
		expect(result.stdout).toBe(
			path.join(testDir, "foo/bar/test-0.0.1.tgz"),
		);
		await expect(pathExists(result.stdout)).resolves.toBe(true);
	}, 60000);

	it("packs scoped non-monorepo projects correctly", async () => {
		const packageJson: Record<string, any> = {
			name: "@scope/test",
			version: "0.0.1-beta.0+1234",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		const result = await yarn.pack();
		expect(result.stdout).toBe(
			path.join(testDir, "scope-test-0.0.1-beta.0+1234.tgz"),
		);
		await expect(pathExists(result.stdout)).resolves.toBe(true);
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

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		let result = await yarn.pack({
			workspace: "packages/package-a",
		});
		expect(result.stdout).toBe(
			path.join(testDir, "test-package-a-0.0.1.tgz"),
		);
		await expect(pathExists(result.stdout)).resolves.toBe(true);

		result = await yarn.pack({
			workspace: "packages/package-b",
		});
		expect(result.stdout).toBe(
			path.join(testDir, "test-package-b-0.0.2.tgz"),
		);
		await expect(pathExists(result.stdout)).resolves.toBe(true);
	}, 60000);
});
