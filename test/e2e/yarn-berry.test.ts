import execa from "execa";
import {
	copy,
	createFile,
	emptyDir,
	ensureDir,
	readJson,
	writeJson,
} from "fs-extra";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { packageManagers } from "../../src/index";

describe("End to end tests - yarn berry", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-yarn-berry");
		await promisify(rimraf)(testDir);
		await ensureDir(testDir);
		// Upgrade it to yarn v3
		for (const file of [".yarnrc.yml", ".yarn/releases/yarn-3.2.3.cjs"]) {
			const source = path.join(__dirname, file);
			const target = path.join(testDir, file);
			await emptyDir(path.dirname(target));
			await copy(source, target);
		}
		// Create empty yarn.lock, or it will look further up the tree
		await createFile(path.join(testDir, "yarn.lock"));
		// Keep yarn from failing when changing the lockfile
		process.env.YARN_ENABLE_IMMUTABLE_INSTALLS = "0";
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

	afterEach(async () => {
		await promisify(rimraf)(testDir);
	});
});
