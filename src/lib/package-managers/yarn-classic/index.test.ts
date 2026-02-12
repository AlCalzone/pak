import spawn from "nano-spawn";
import * as nodeFs from "node:fs/promises";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { YarnClassic } from "./index.js";

vi.mock("node:fs/promises");
const accessMock = nodeFs.access as unknown as Mock;

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
	stdout: "1.2.3",
	stderr: "",
	output: "1.2.3",
};

const return_nok: MockError = {
	exitCode: 1,
	stdout: "not ok",
	stderr: "error",
	output: "not ok\nerror",
};

describe("yarn.install()", () => {
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
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

	it("respects the package manager's loglevel where supported", async () => {
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
		mockSubprocess(return_ok);
		await yarn.install(["whatever"], {
			global: true,
		});
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"global",
			"add",
			"whatever",
		]);
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
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
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

	it("respects the package manager's loglevel where supported", async () => {
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
			expect.arrayContaining(["--dev"]),
		);
	});

	it("respects the global option", async () => {
		mockSubprocess(return_ok);
		await yarn.uninstall(["whatever"], {
			global: true,
		});
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"global",
			"remove",
			"whatever",
		]);
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
	let yarn: YarnClassic;

	beforeEach(() => {
		yarn = new YarnClassic();
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

	it("respects the package manager's loglevel where supported", async () => {
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
		mockSubprocess(return_ok);
		await yarn.update(["whatever"], {
			global: true,
		});
		expect(spawnMock.mock.calls[0][0]).toBe("yarn");
		expect(spawnMock.mock.calls[0][1]).toEqual([
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
		spawnMock.mockReset();
	});

	it("is not supported", async () => {
		const result = await yarn.rebuild();
		expect(result.success).toBe(false);
		expect(result.stderr).toMatch(`does not support the "rebuild"`);
	});
});

describe("yarn.detect()", () => {
	it("returns true when there is a yarn.lock in the root directory and yarn is version 1", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			if (filename.replace(/\\/g, "/") === "/path/to/yarn.lock")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});
		spawnMock.mockReset();
		mockSubprocess(return_version);

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(true);
	});

	it("returns false when there isn't", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("returns false when the root dir cannot be found", async () => {
		accessMock.mockRejectedValue(new Error("ENOENT"));

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("updates the cwd when the setCwdToPackageRoot option is set", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			if (filename.replace(/\\/g, "/") === "/path/to/yarn.lock")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});
		spawnMock.mockReset();
		mockSubprocess(return_version);

		const pm = new YarnClassic();
		pm.cwd = "/path/to/sub/directory/cwd";
		await pm.detect(true, true);
		expect(pm.cwd).toBe("/path/to");
	});
});
