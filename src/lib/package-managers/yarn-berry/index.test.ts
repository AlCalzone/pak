import spawn from "nano-spawn";
import fsExtra from "fs-extra";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { YarnBerry } from "./index.js";

vi.mock("fs-extra");
const pathExistsMock = fsExtra.pathExists as Mock;

vi.mock("nano-spawn");
const spawnMock = spawn as any as Mock;

interface MockResult {
	stdout: string;
	stderr: string;
	output: string;
}

interface MockError extends MockResult {
	exitCode: number;
}

function mockSubprocess(result: MockResult) {
	spawnMock.mockImplementation(() =>
		Object.assign(Promise.resolve(result), { nodeChildProcess: {} }),
	);
}

function mockSubprocessError(error: MockError) {
	spawnMock.mockImplementation(() => {
		const p = Promise.reject(
			Object.assign(new Error("Command failed"), error),
		) as any;
		p.nodeChildProcess = {};
		return p;
	});
}

const return_ok: MockResult = {
	stdout: "ok",
	stderr: "",
	output: "ok",
};

const return_version: MockResult = {
	stdout: "2.0.1",
	stderr: "",
	output: "2.0.1",
};

const return_nok: MockError = {
	exitCode: 1,
	stdout: "not ok",
	stderr: "error",
	output: "not ok\nerror",
};

describe("yarn.install()", () => {
	let yarn: YarnBerry;

	beforeEach(() => {
		yarn = new YarnBerry();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(["add", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"add",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await yarn.install(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await yarn.install(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await yarn.install(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await yarn.install(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		yarn.cwd = "/foo/bar";
		await yarn.install(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: yarn.cwd });
	});

	// Yarn Berry doesn't support changing the loglevel
	it.skip("respects the package manager's loglevel where supported", async () => {
		mockSubprocess(return_ok);
		yarn.loglevel = "verbose";
		await yarn.install(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--verbose"]),
		);

		yarn.loglevel = "silent";
		await yarn.install(["whatever"]);
		expect(spawnMock.mock.calls[1][0]).toBe("yarn");
		expect(spawnMock.mock.calls[1][1]).toEqual(
			expect.arrayContaining(["--silent"]),
		);
	});

	it("respects the dependency type", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["whatever"], {
			dependencyType: "dev",
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--dev"]),
		);
	});

	it("respects the save option", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["whatever"], {
			exact: true,
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--exact"]),
		);
	});

	it("respects the global option", async () => {
		const result = await yarn.install(["whatever"], {
			global: true,
		});

		expect(result.success).toBe(false);
		expect(result.stderr).toMatch(`does not support global`);
	});

	it("passes the additional args on", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("yarn.uninstall()", () => {
	let yarn: YarnBerry;

	beforeEach(() => {
		yarn = new YarnBerry();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await yarn.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(["remove", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await yarn.uninstall(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"remove",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await yarn.uninstall(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await yarn.uninstall(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await yarn.uninstall(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await yarn.uninstall(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await yarn.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		yarn.cwd = "/foo/bar";
		await yarn.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: yarn.cwd });
	});

	// Yarn Berry doesn't support changing the loglevel
	it.skip("respects the package manager's loglevel where supported", async () => {
		mockSubprocess(return_ok);
		yarn.loglevel = "verbose";
		await yarn.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--verbose"]),
		);

		yarn.loglevel = "silent";
		await yarn.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[1][0]).toBe("yarn");
		expect(spawnMock.mock.calls[1][1]).toEqual(
			expect.arrayContaining(["--silent"]),
		);
	});

	it("respects the dependency type", async () => {
		mockSubprocess(return_ok);
		await yarn.uninstall(["whatever"], {
			dependencyType: "dev",
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.not.arrayContaining(["--dev"]),
		);
	});

	it("respects the global option", async () => {
		const result = await yarn.uninstall(["whatever"], {
			global: true,
		});

		expect(result.success).toBe(false);
		expect(result.stderr).toMatch(`does not support global`);
	});

	it("passes the additional args on", async () => {
		mockSubprocess(return_ok);
		await yarn.install(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("yarn.update()", () => {
	let yarn: YarnBerry;

	beforeEach(() => {
		yarn = new YarnBerry();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await yarn.update(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(["add", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await yarn.update(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"add",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await yarn.update(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await yarn.update(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await yarn.update(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await yarn.update(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await yarn.update(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		yarn.cwd = "/foo/bar";
		await yarn.update(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: yarn.cwd });
	});

	// Yarn Berry doesn't support changing the loglevel
	it.skip("respects the package manager's loglevel where supported", async () => {
		mockSubprocess(return_ok);
		yarn.loglevel = "verbose";
		await yarn.update(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--verbose"]),
		);

		yarn.loglevel = "silent";
		await yarn.update(["whatever"]);
		expect(spawnMock.mock.calls[1][0]).toBe("yarn");
		expect(spawnMock.mock.calls[1][1]).toEqual(
			expect.arrayContaining(["--silent"]),
		);
	});

	it("respects the dependency type", async () => {
		mockSubprocess(return_ok);
		await yarn.update(["whatever"], {
			dependencyType: "dev",
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--dev"]),
		);
	});

	it("respects the global option", async () => {
		const result = await yarn.update(["whatever"], {
			global: true,
		});

		expect(result.success).toBe(false);
		expect(result.stderr).toMatch(`does not support global`);
	});
});

describe("yarn.rebuild()", () => {
	let yarn: YarnBerry;

	beforeEach(() => {
		yarn = new YarnBerry();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await yarn.rebuild(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual(["rebuild", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await yarn.rebuild(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"rebuild",
			"all",
			"these",
			"packages",
		]);
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
		spawnMock.mockReset();
		mockSubprocess(return_version);

		const pm = new YarnBerry();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(true);
	});

	it("returns false when there isn't", async () => {
		pathExistsMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve(true);
			return Promise.resolve(false);
		});

		const pm = new YarnBerry();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("returns false when the root dir cannot be found", async () => {
		pathExistsMock.mockResolvedValue(false);

		const pm = new YarnBerry();
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
		spawnMock.mockReset();
		mockSubprocess(return_version);

		const pm = new YarnBerry();
		pm.cwd = "/path/to/sub/directory/cwd";
		await pm.detect(true, true);
		expect(pm.cwd).toBe("/path/to");
	});
});
