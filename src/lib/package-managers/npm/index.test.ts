import execa from "execa";
import fsExtra from "fs-extra";
import { Npm } from ".";

jest.mock("fs-extra");
const pathExistsMock = fsExtra.pathExists as jest.Mock;

jest.mock("execa");
const execaMock = (execa as any) as jest.Mock;

const return_ok: execa.ExecaReturnValue<string> = {
	command: "foobar",
	exitCode: 0,
	stderr: "",
	stdout: "ok",
	isCanceled: false,
	failed: false,
	timedOut: false,
	killed: false,
};

const return_nok: execa.ExecaReturnValue<string> = {
	command: "foobar",
	exitCode: 1,
	stderr: "error",
	stdout: "not ok",
	isCanceled: false,
	failed: true,
	timedOut: false,
	killed: false,
};

describe("npm.install()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(["install", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"install",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await npm.install(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await npm.install(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await npm.install(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await npm.install(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.cwd = "/foo/bar";
		await npm.install(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.loglevel = "error";
		await npm.install(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});

	it("respects the dependency type", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever"], {
			dependencyType: "dev",
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-dev"]),
		);
	});

	it("respects the save option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever"], {
			exact: true,
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-exact"]),
		);
	});

	it("defaults to --save-exact if a specific version is given", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever@1.2.3"]);
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-exact"]),
		);
	});

	it("respects the global option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever"], {
			global: true,
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--global"]),
		);
	});

	it("passes the additional args on", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.install(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("npm.uninstall()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(["uninstall", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.uninstall(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"uninstall",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await npm.uninstall(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await npm.uninstall(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await npm.uninstall(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await npm.uninstall(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.cwd = "/foo/bar";
		await npm.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.loglevel = "error";
		await npm.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});

	it("respects the dependency type", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.uninstall(["whatever"], {
			dependencyType: "dev",
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-dev"]),
		);
	});

	it("respects the global option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.uninstall(["whatever"], {
			global: true,
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--global"]),
		);
	});

	it("passes the additional args on", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.uninstall(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("npm.update()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.update(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(["update", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.update(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"update",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await npm.update(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await npm.update(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await npm.update(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await npm.update(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.update(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.cwd = "/foo/bar";
		await npm.update(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.loglevel = "error";
		await npm.update(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});

	it("respects the dependency type", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.update(["whatever"], {
			dependencyType: "dev",
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-dev"]),
		);
	});

	it("respects the global option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.update(["whatever"], {
			global: true,
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["-g"]),
		);
	});
});

describe("npm.rebuild()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.rebuild(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(["rebuild", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.rebuild(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"rebuild",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await npm.rebuild(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await npm.rebuild(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await npm.rebuild(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await npm.rebuild(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await npm.rebuild(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.cwd = "/foo/bar";
		await npm.rebuild(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		execaMock.mockResolvedValue(return_ok);
		npm.loglevel = "error";
		await npm.rebuild(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("npm");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});
});

describe("npm.detect()", () => {
	it("returns true when there is a package-lock.json in the root directory", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			if (filename.replace(/\\/g, "/") === "/path/to/package-lock.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(true);
	});

	it("returns false when there isn't", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("returns false when the root dir cannot be found", async () => {
		pathExistsMock.mockResolvedValue(false);

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("updates the cwd when the setCwdToPackageRoot option is set", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			if (filename.replace(/\\/g, "/") === "/path/to/package-lock.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await pm.detect(true, true);
		expect(pm.cwd).toBe("/path/to");
	});
});
