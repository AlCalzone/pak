import { ensureDir, readJson, writeJson } from "fs-extra";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { packageManagers } from "../../src/index";

describe("End to end tests - npm", () => {
	let testDir: string;

	beforeAll(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-npm");
		await ensureDir(testDir);
	});

	it("installs correctly using npm", async () => {
		jest.setTimeout(60000);
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

		packageJson = await readJson(packageJsonPath);
		expect(packageJson.dependencies["is-even"]).toBe("0.1.0");
		expect(packageJson.devDependencies["is-odd"]).toBe("^3.0.0");

		await npm.update(["is-odd"]); // there's at least a 3.0.1 to update to
		packageJson = await readJson(packageJsonPath);
		expect(packageJson.dependencies["is-odd"]).not.toBe("^3.0.0");

		await npm.uninstall(["is-even"]);
		await npm.uninstall(["is-odd"], { dependencyType: "dev" });
		packageJson = await readJson(packageJsonPath);

		expect(packageJson.dependencies).not.toHaveProperty("is-even");
		expect(packageJson.dependencies).not.toHaveProperty("is-odd");
	});

	afterAll(async () => {
		await promisify(rimraf)(testDir);
	});
});
