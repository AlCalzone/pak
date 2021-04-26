import execa from "execa";
import { ensureDir, readJson, writeJson } from "fs-extra";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { packageManagers } from "../../src/index";

describe("End to end tests - yarn", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-yarn");
		await promisify(rimraf)(testDir);
		await ensureDir(testDir);
	});

	it("installs und uninstalls correctly", async () => {
		jest.setTimeout(60000);
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
	});

	it("overriding dependencies works", async () => {
		jest.setTimeout(60000);
		const packageJson: Record<string, any> = {
			name: "test",
			version: "0.0.1",
		};
		const packageJsonPath = path.join(testDir, "package.json");
		await writeJson(packageJsonPath, packageJson);

		const yarn = new packageManagers.yarn();
		yarn.cwd = testDir;

		// is-even@1.0.0 includes is-odd@^0.1.2, which also has newer versions (1.0.0+)
		await yarn.install(["is-even@1.0.0"]);
		let version = await execa.command(
			'node -p require("is-odd/package.json").version',
			{
				cwd: testDir,
				reject: false,
				encoding: "utf8",
			},
		);
		expect(version.stdout).toMatch(/^0\./);

		const result = await yarn.overrideDependencies({
			"is-odd": "1.0.0",
		});
		expect(result.success).toBe(true);

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
	});

	afterEach(async () => {
		await promisify(rimraf)(testDir);
	});
});
