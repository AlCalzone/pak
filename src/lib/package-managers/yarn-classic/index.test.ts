import execa from "execa";
import fsExtra from "fs-extra";
import { YarnClassic } from ".";

jest.mock("fs-extra");
const pathExistsMock = fsExtra.pathExists as jest.Mock;

jest.mock("execa");
const execaMock = execa as any as jest.Mock;

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

const return_version: execa.ExecaReturnValue<string> = {
	command: "yarn -v",
	exitCode: 0,
	stderr: "",
	stdout: "1.2.3",
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

describe("yarn.install()", () => {
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(["add", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"add",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await yarn.install(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await yarn.install(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await yarn.install(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await yarn.install(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		yarn.cwd = "/foo/bar";
		await yarn.install(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: yarn.cwd });
	});

	it("respects the package manager's loglevel where supported", async () => {
		execaMock.mockResolvedValue(return_ok);
		yarn.loglevel = "verbose";
		await yarn.install(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--verbose"]),
		);

		yarn.loglevel = "silent";
		await yarn.install(["whatever"]);
		expect(execaMock.mock.calls[1][0]).toBe("yarn");
		expect(execaMock.mock.calls[1][1]).toEqual(
			expect.arrayContaining(["--silent"]),
		);
	});

	it("respects the dependency type", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"], {
			dependencyType: "dev",
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--dev"]),
		);
	});

	it("respects the save option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"], {
			exact: true,
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--exact"]),
		);
	});

	it("respects the global option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"], {
			global: true,
		});
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"global",
			"add",
			"whatever",
		]);
	});

	it("passes the additional args on", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("yarn.uninstall()", () => {
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(["remove", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.uninstall(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"remove",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await yarn.uninstall(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await yarn.uninstall(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await yarn.uninstall(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await yarn.uninstall(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		yarn.cwd = "/foo/bar";
		await yarn.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: yarn.cwd });
	});

	it("respects the package manager's loglevel where supported", async () => {
		execaMock.mockResolvedValue(return_ok);
		yarn.loglevel = "verbose";
		await yarn.uninstall(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--verbose"]),
		);

		yarn.loglevel = "silent";
		await yarn.uninstall(["whatever"]);
		expect(execaMock.mock.calls[1][0]).toBe("yarn");
		expect(execaMock.mock.calls[1][1]).toEqual(
			expect.arrayContaining(["--silent"]),
		);
	});

	it("respects the dependency type", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.uninstall(["whatever"], {
			dependencyType: "dev",
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--dev"]),
		);
	});

	it("respects the global option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.uninstall(["whatever"], {
			global: true,
		});
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"global",
			"remove",
			"whatever",
		]);
	});

	it("passes the additional args on", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.install(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("yarn.update()", () => {
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
		execaMock.mockReset();
	});

	it("executes the correct command", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.update(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(["add", "whatever"]);
	});

	it("handles multiple packages", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.update(["all", "these", "packages"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"add",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		execaMock.mockResolvedValue(return_ok);
		const result = await yarn.update(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		execaMock.mockResolvedValue(return_nok);
		const result = await yarn.update(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		execaMock.mockResolvedValue(return_ok);
		let result = await yarn.update(["whatever"]);
		expect(result.exitCode).toBe(return_ok.exitCode);

		execaMock.mockResolvedValue(return_nok);
		result = await yarn.update(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.update(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		execaMock.mockResolvedValue(return_ok);
		yarn.cwd = "/foo/bar";
		await yarn.update(["whatever"]);
		expect(execaMock.mock.calls[0][2]).toMatchObject({ cwd: yarn.cwd });
	});

	it("respects the package manager's loglevel where supported", async () => {
		execaMock.mockResolvedValue(return_ok);
		yarn.loglevel = "verbose";
		await yarn.update(["whatever"]);
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--verbose"]),
		);

		yarn.loglevel = "silent";
		await yarn.update(["whatever"]);
		expect(execaMock.mock.calls[1][0]).toBe("yarn");
		expect(execaMock.mock.calls[1][1]).toEqual(
			expect.arrayContaining(["--silent"]),
		);
	});

	it("respects the dependency type", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.update(["whatever"], {
			dependencyType: "dev",
		});
		expect(execaMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--dev"]),
		);
	});

	it("respects the global option", async () => {
		execaMock.mockResolvedValue(return_ok);
		await yarn.update(["whatever"], {
			global: true,
		});
		expect(execaMock.mock.calls[0][0]).toBe("yarn");
		expect(execaMock.mock.calls[0][1]).toEqual([
			"global",
			"add",
			"whatever",
		]);
	});
});

describe("yarn.rebuild()", () => {
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
		execaMock.mockReset();
	});

	it("is not supported", async () => {
		const result = await yarn.rebuild();
		expect(result.success).toBe(false);
		expect(result.stderr).toMatch(`does not support the "rebuild"`);
	});
});

describe("yarn.detect()", () => {
	it("returns true when there is a yarn.lock in the root directory and yarn is version 1", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			if (filename.replace(/\\/g, "/") === "/path/to/yarn.lock")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});
		execaMock.mockReset().mockResolvedValue(return_version);

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(true);
	});

	it("returns false when there isn't", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("returns false when the root dir cannot be found", async () => {
		pathExistsMock.mockResolvedValue(false);

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("updates the cwd when the setCwdToPackageRoot option is set", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			if (filename.replace(/\\/g, "/") === "/path/to/yarn.lock")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});
		execaMock.mockReset().mockResolvedValue(return_version);

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";
		await pm.detect(true, true);
		expect(pm.cwd).toBe("/path/to");
	});
});
