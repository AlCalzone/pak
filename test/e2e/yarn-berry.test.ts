import spawn from "nano-spawn";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import os from "os";
import path from "path";
import { rimraf } from "rimraf";
import { packageManagers } from "../../src/index.js";

describe("End to end tests - yarn berry", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-yarn-berry");
		await rimraf(testDir);
		await fs.mkdir(testDir, { recursive: true });
		// Upgrade it to yarn v3
		const templatesDir = path.join(__dirname, ".yarn-berry");
		for (const file of await fs.readdir(templatesDir)) {
			const source = path.join(templatesDir, file);
			const target = path.join(testDir, file);
			await fs.cp(source, target, { recursive: true });
		}
		// Create empty yarn.lock, or it will look further up the tree
		await fs.writeFile(path.join(testDir, "yarn.lock"), "");
		// Keep yarn from failing when changing the lockfile
		process.env.YARN_ENABLE_IMMUTABLE_INSTALLS = "0";
	});

	afterEach(async () => {
		await rimraf(testDir);
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
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;
		await expect(yarn.findRoot()).resolves.toBe(testDir);

		await yarn.install(["is-even@0.1.0"], { exact: true });
		await yarn.install(["is-odd@^3.0.0"], { dependencyType: "dev" });

		// Now that something is installed, there should be a yarn.lock
		await expect(yarn.findRoot("yarn.lock")).resolves.toBe(testDir);

		packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
		expect(packageJson.dependencies["is-even"]).toBe("0.1.0");
		expect(packageJson.devDependencies["is-odd"]).toBe("^3.0.0");

		await yarn.update(["is-odd"]); // there's at least a 3.0.1 to update to
		packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
		expect(packageJson.devDependencies["is-odd"]).not.toBe("^3.0.0");

		await yarn.uninstall(["is-even"]);
		await yarn.uninstall(["is-odd"], { dependencyType: "dev" });
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

		const yarn = new packageManagers.yarn();
		yarn.loglevel = "verbose";
		yarn.cwd = testDir;

		// is-even@1.0.0 includes is-odd@^0.1.2, which also has newer versions (1.0.0+)
		let result = await yarn.install(["is-even@1.0.0"]);
		expect(result.success).toBe(true);

		let version = await spawn("node", ["-p", 'require("is-odd/package.json").version'], { cwd: testDir });
		expect(version.stdout).toMatch(/^0\./);

		result = await yarn.overrideDependencies({
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
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		await yarn.install([]);
		// not found!
		await expect(
			spawn("node", ["-p", 'require("is-odd/package.json").version'], { cwd: testDir }),
		).rejects.toThrow();

		yarn.environment = "development";
		await yarn.install([]);
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

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		const result = await yarn.pack({
			targetDir: path.join(testDir, "foo/bar"),
		});
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

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		const result = await yarn.pack();
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

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		let result = await yarn.pack({
			workspace: "packages/package-a",
		});
		expect(result.stdout).toBe(
			path.join(testDir, "test-package-a-0.0.1.tgz"),
		);
		await expect(fs.access(result.stdout)).resolves.toBeUndefined();

		result = await yarn.pack({
			workspace: "packages/package-b",
		});
		expect(result.stdout).toBe(
			path.join(testDir, "test-package-b-0.0.2.tgz"),
		);
		await expect(fs.access(result.stdout)).resolves.toBeUndefined();
	}, 60000);
});
