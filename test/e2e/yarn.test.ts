import { ensureDir, readJson, writeJson } from "fs-extra";
import os from "os";
import path from "path";
import rimraf from "rimraf";
import { promisify } from "util";
import { packageManagers } from "../../src/index";

describe("End to end tests - yarn", () => {
	let testDir: string;

	beforeAll(async () => {
		// Create test directory
		testDir = path.join(os.tmpdir(), "pak-test-yarn");
		await ensureDir(testDir);
	});

	it("installs correctly using yarn", async () => {
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

	afterAll(async () => {
		await promisify(rimraf)(testDir);
	});
});
