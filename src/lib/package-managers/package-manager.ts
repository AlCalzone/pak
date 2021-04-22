import type { ExecaReturnValue } from "execa";
import { pathExists } from "fs-extra";
import path from "path";
export abstract class PackageManager {
	/** Installs the specified packages */
	public abstract install(
		packages: string[],
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

	/** The directory to run the package manager commands in */
	public cwd: string = process.cwd();

	/** Which loglevel to pass to the package manager */
	public loglevel?: "info" | "verbose" | "warn" | "error" | "silent";

	/** Finds the closest parent directory that contains a package.json */
	public async findRoot(): Promise<string> {
		let curDir = this.cwd;
		let parentDir: string;
		while (true) {
			const packageJsonPath = path.join(curDir, "package.json");
			if (await pathExists(packageJsonPath)) return curDir;
			parentDir = path.dirname(curDir);
			if (parentDir === curDir) {
				// we've reached the root without finiding a package.json
				throw new Error(
					"This directory tree does not contain a package.json",
				);
			}
			curDir = parentDir;
		}
	}

	/** Tests if this package manager should be active in the current directory */
	public abstract detect(): Promise<boolean>;
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
	};
}
