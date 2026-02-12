import spawn from "nano-spawn";
import * as nodeFs from "node:fs/promises";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { Npm } from "./index.js";

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

const return_nok: MockError = {
	exitCode: 1,
	stdout: "not ok",
	stderr: "error",
	output: "not ok\nerror",
};

describe("npm.install()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(["install", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await npm.install(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"install",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await npm.install(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await npm.install(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await npm.install(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await npm.install(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		npm.cwd = "/foo/bar";
		await npm.install(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		mockSubprocess(return_ok);
		npm.loglevel = "error";
		await npm.install(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});

	it("respects the dependency type", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever"], {
			dependencyType: "dev",
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-dev"]),
		);
	});

	it("respects the save option", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever"], {
			exact: true,
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-exact"]),
		);
	});

	it("defaults to --save-exact if a specific version is given", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever@1.2.3"]);
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-exact"]),
		);
	});

	it("respects the global option", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever"], {
			global: true,
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--global"]),
		);
	});

	it("passes the additional args on", async () => {
		mockSubprocess(return_ok);
		await npm.install(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("npm.uninstall()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await npm.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(["uninstall", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await npm.uninstall(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"uninstall",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await npm.uninstall(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await npm.uninstall(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await npm.uninstall(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await npm.uninstall(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await npm.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		npm.cwd = "/foo/bar";
		await npm.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		mockSubprocess(return_ok);
		npm.loglevel = "error";
		await npm.uninstall(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});

	it("respects the dependency type", async () => {
		mockSubprocess(return_ok);
		await npm.uninstall(["whatever"], {
			dependencyType: "dev",
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-dev"]),
		);
	});

	it("respects the global option", async () => {
		mockSubprocess(return_ok);
		await npm.uninstall(["whatever"], {
			global: true,
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--global"]),
		);
	});

	it("passes the additional args on", async () => {
		mockSubprocess(return_ok);
		await npm.uninstall(["whatever"], {
			additionalArgs: ["--foo", "--bar"],
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--foo", "--bar"]),
		);
	});
});

describe("npm.update()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await npm.update(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(["update", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await npm.update(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"update",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await npm.update(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await npm.update(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await npm.update(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await npm.update(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await npm.update(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		npm.cwd = "/foo/bar";
		await npm.update(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		mockSubprocess(return_ok);
		npm.loglevel = "error";
		await npm.update(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});

	it("respects the dependency type", async () => {
		mockSubprocess(return_ok);
		await npm.update(["whatever"], {
			dependencyType: "dev",
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--save-dev"]),
		);
	});

	it("respects the global option", async () => {
		mockSubprocess(return_ok);
		await npm.update(["whatever"], {
			global: true,
		});
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["-g"]),
		);
	});
});

describe("npm.rebuild()", () => {
	let npm: Npm;

	beforeEach(() => {
		npm = new Npm();
		spawnMock.mockReset();
	});

	it("executes the correct command", async () => {
		mockSubprocess(return_ok);
		await npm.rebuild(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(["rebuild", "whatever"]);
	});

	it("handles multiple packages", async () => {
		mockSubprocess(return_ok);
		await npm.rebuild(["all", "these", "packages"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual([
			"rebuild",
			"all",
			"these",
			"packages",
		]);
	});

	it("result.success is true when the command succeeds", async () => {
		mockSubprocess(return_ok);
		const result = await npm.rebuild(["whatever"]);
		expect(result.success).toBe(true);
	});

	it("result.success is false when the command fails", async () => {
		mockSubprocessError(return_nok);
		const result = await npm.rebuild(["whatever"]);
		expect(result.success).toBe(false);
	});

	it("result.exitCode contains the command exit code", async () => {
		mockSubprocess(return_ok);
		let result = await npm.rebuild(["whatever"]);
		expect(result.exitCode).toBe(0);

		mockSubprocessError(return_nok);
		result = await npm.rebuild(["whatever"]);
		expect(result.exitCode).toBe(return_nok.exitCode);
	});

	it("defaults commands to the current cwd", async () => {
		mockSubprocess(return_ok);
		await npm.rebuild(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({
			cwd: process.cwd(),
		});
	});

	it("respects the package manager's cwd", async () => {
		mockSubprocess(return_ok);
		npm.cwd = "/foo/bar";
		await npm.rebuild(["whatever"]);
		expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: npm.cwd });
	});

	it("respects the package manager's loglevel", async () => {
		mockSubprocess(return_ok);
		npm.loglevel = "error";
		await npm.rebuild(["whatever"]);
		expect(spawnMock.mock.calls[0][0]).toBe("npm");
		expect(spawnMock.mock.calls[0][1]).toEqual(
			expect.arrayContaining(["--loglevel", "error"]),
		);
	});
});

describe("npm.detect()", () => {
	it("returns true when there is a package-lock.json in the root directory", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			if (filename.replace(/\\/g, "/") === "/path/to/package-lock.json")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(true);
	});

	it("returns false when there isn't", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("returns false when the root dir cannot be found", async () => {
		accessMock.mockRejectedValue(new Error("ENOENT"));

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await expect(pm.detect()).resolves.toBe(false);
	});

	it("updates the cwd when the setCwdToPackageRoot option is set", async () => {
		accessMock.mockImplementation((filename: string) => {
			if (filename.replace(/\\/g, "/") === "/path/to/package.json")
				return Promise.resolve();
			if (filename.replace(/\\/g, "/") === "/path/to/package-lock.json")
				return Promise.resolve();
			return Promise.reject(new Error("ENOENT"));
		});

		const pm = new Npm();
		pm.cwd = "/path/to/sub/directory/cwd";

		await pm.detect(true, true);
		expect(pm.cwd).toBe("/path/to");
	});
});
