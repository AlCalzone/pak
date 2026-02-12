import * as nodeFs from "node:fs/promises";
import { describe, expect, it, type Mock, vi } from "vitest";
import { Npm } from "./npm/index.js";

vi.mock("node:fs/promises");
const accessMock = nodeFs.access as unknown as Mock;

describe("PackageManager.findRoot()", () => {
	it("finds the nearest directory with a package.json and the corresponding lockfile", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			if (filename.replace(/\\/g, "/") === "/path/to/lockfile.json")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";
		const root = await pm.findRoot("lockfile.json");
		expect(root).toBe("/path/to");
	});

	it("and throws when there is none", async () => {
		accessMock.mockRejectedValue(new Error("ENOENT"));

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";
		await expect(pm.findRoot("lockfile")).rejects.toThrow();
	});
});
