import fsExtra from "fs-extra";
import { describe, expect, it, type Mock, vi } from "vitest";
import { Npm } from "./npm/index.js";

vi.mock("fs-extra");
const pathExistsMock = fsExtra.pathExists as Mock;

describe("PackageManager.findRoot()", () => {
	it("finds the nearest directory with a package.json and the corresponding lockfile", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			if (filename.replace(/\\/g, "/") === "/path/to/lockfile.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";
		const root = await pm.findRoot("lockfile.json");
		expect(root).toBe("/path/to");
	});

	it("and throws when there is none", async () => {
		pathExistsMock.mockResolvedValue(false);

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";
		await expect(pm.findRoot("lockfile")).rejects.toThrow();
	});
});
