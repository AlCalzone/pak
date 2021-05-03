import type { ExecaReturnValue } from "execa";
import { pathExists } from "fs-extra";
import path from "path";
import type { Writable } from "stream";

export abstract class PackageManager {
	/**
	 * Tests if this package manager should be active in the current directory.
	 * @param requireLockfile Whether a matching lockfile must be present for the check to succeed
	 */
	public abstract detect(requireLockfile?: boolean): Promise<boolean>;

	/** Installs the specified packages */
	public abstract install(
		packages?: string[],
		options?: InstallOptions,
	): Promise<CommandResult>;

	/** Uninstalls the specified packages */
	public abstract uninstall(
		packages: string[],
		options?: UninstallOptions,
	): Promise<CommandResult>;

	/** Updates the specified packages or all of them if none are specified */
	public abstract update(
		packages?: string[],
		options?: UpdateOptions,
	): Promise<CommandResult>;

	/** Rebuilds the specified native packages or all of them if none are specified */
	public abstract rebuild(packages?: string[]): Promise<CommandResult>;

	/** Returns the active version of the package manager */
	public abstract version(): Promise<string>;

	/** Finds the closest parent directory that contains a package.json and the corresponding lockfile (if one was specified) */
	public async findRoot(lockfile?: string): Promise<string> {
		let curDir = this.cwd;
		let parentDir: string;
		while (true) {
			const packageJsonPath = path.join(curDir, "package.json");
			if (await pathExists(packageJsonPath)) {
				if (!lockfile) return curDir;
				const lockfilePath = path.join(curDir, lockfile);
				if (await pathExists(lockfilePath)) return curDir;
			}

			parentDir = path.dirname(curDir);
			if (parentDir === curDir) {
				// we've reached the root without finiding a package.json
				throw new Error(
					`This directory tree does not contain a directory with package.json${
						lockfile ? " and a lockfile" : ""
					}!`,
				);
			}
			curDir = parentDir;
		}
	}

	/** Forces the given dependency versions to be installed, rather than what the official packages require */
	public abstract overrideDependencies(
		dependencies: Record<string, string>,
	): Promise<CommandResult>;

	/** The directory to run the package manager commands in */
	public cwd: string = process.cwd();

	/** Which loglevel to pass to the package manager */
	public loglevel?: "info" | "verbose" | "warn" | "error" | "silent";

	/** The (optional) stream to pipe the command's stdout into */
	public stdout?: Writable;
	/** The (optional) stream to pipe the command's stderr into */
	public stderr?: Writable;
	/**
	 * The (optional) stream to pipe the command's entire output (stdout + stderr) into.
	 * If this is set, stdout and stderr will be ignored
	 */
	public stdall?: Writable;

	/**
	 * The environment the package manager is executed in (default: "production").
	 * In an production environment, `pak` avoids accidentally pulling in `devDependencies`.
	 */
	public environment: "production" | "development" = "production";
}

export interface InstallBaseOptions {
	/** Whether to install a production or dev dependency. Default: "prod" */
	dependencyType?: "prod" | "dev";
	/** Whether to install the package globally. Default: false */
	global?: boolean;
}

export interface InstallOptions extends InstallBaseOptions {
	/** Whether exact versions should be used instead of "^ver.si.on". Default: false */
	exact?: boolean;
}

export type UninstallOptions = InstallBaseOptions;
export type UpdateOptions = InstallBaseOptions;

export interface CommandResult {
	/** Whether the command execution was successful */
	success: boolean;
	/** The exit code of the command execution */
	exitCode: number;
	/** The captured stdout */
	stdout: string;
	/** The captured stderr */
	stderr: string;
	/** The captured stdout and stderr, interleaved like it would appear on the console */
	stdall: string;
}

export function execaReturnValueToCommandResult(
	result: ExecaReturnValue,
): CommandResult {
	return {
		success:
			!result.failed &&
			!result.isCanceled &&
			!result.killed &&
			!result.timedOut,
		exitCode: result.exitCode,
		stdout: result.stdout,
		stderr: result.stderr,
		stdall: result.all!,
	};
}
