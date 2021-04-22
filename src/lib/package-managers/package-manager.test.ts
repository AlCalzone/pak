import fsExtra from "fs-extra";
import { Npm } from "./npm";

jest.mock("fs-extra");
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("PackageManager.findRoot()", () => {
	it("finds the nearest package.json", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";
		const root = await pm.findRoot();
		expect(root).toBe("/path/to");
	});

	it("and throws when there is none", async () => {
		pathExistsMock.mockResolvedValue(false);

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";
		expect(() => pm.findRoot()).rejects;
	});
});
