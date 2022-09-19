import execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";
import {
	CommandResult,
	execaReturnValueToCommandResult,
	InstallOptions,
	PackageManager,
	PackOptions,
	UninstallOptions,
	UpdateOptions,
} from "../package-manager";

function setLoglevel(args: string[], loglevel: PackageManager["loglevel"]) {
	if (loglevel === "silent" || loglevel === "verbose") {
		args.push(`--${loglevel}`);
	}
}

export class YarnClassic extends PackageManager {
	/** Executes a "raw" yarn command */
	private async command(
		args: string[],
		options: execa.Options<string> = {},
	): Promise<CommandResult> {
		const promise = execa("yarn", args, {
			...options,
			cwd: this.cwd,
			reject: false,
			all: true,
		});

		// Pipe command outputs if desired
		if (this.stdout) promise.stdout?.pipe(this.stdout, { end: false });
		if (this.stderr) promise.stderr?.pipe(this.stderr, { end: false });
		if (this.stdall) promise.all?.pipe(this.stdall, { end: false });
		// Execute the command
		const result = await promise;
		// Unpipe the command outputs again, so the process can end
		promise.stdout?.unpipe();
		promise.stderr?.unpipe();
		promise.all?.unpipe();

		// Translate the returned result
		return execaReturnValueToCommandResult(result);
	}

	/**
	 * Installs the given packages using `yarn add`. If no packages are given, `yarn install` is executed in the cwd.
	 */
	public install(
		packages: string[] = [],
		options: InstallOptions = {},
	): Promise<CommandResult> {
		const args: string[] = [];
		if (packages.length > 0) {
			if (options.global) args.push("global");
			args.push("add");
			args.push(...packages);

			if (options.dependencyType === "dev") {
				args.push("--dev");
			}
			if (options.exact) {
				args.push("--exact");
			}
		} else {
			args.push("install");
			if (this.environment === "production") {
				args.push("--production");
			}
			if (options.ignoreScripts) {
				args.push("--ignore-scripts");
			}
		}
		setLoglevel(args, this.loglevel);

		if (options.additionalArgs) {
			args.push(...options.additionalArgs);
		}

		return this.command(args);
	}

	public uninstall(
		packages: string[],
		options: UninstallOptions = {},
	): Promise<CommandResult> {
		const args: string[] = [];
		if (options.global) args.push("global");
		args.push("remove");
		args.push(...packages);

		if (options.dependencyType === "dev") {
			args.push("--dev");
		}
		setLoglevel(args, this.loglevel);

		if (options.additionalArgs) {
			args.push(...options.additionalArgs);
		}

		return this.command(args);
	}

	public update(
		packages: string[] = [],
		options: UpdateOptions = {},
	): Promise<CommandResult> {
		// We want to update the package.json entries and yarn only does that
		// when using the `add` command
		return this.install(packages, options);
	}

	public async rebuild(): Promise<CommandResult> {
		const stderr = `yarn classic does not support the "rebuild" command!`;
		return {
			success: false,
			exitCode: 1,
			stdout: "",
			stderr,
			stdall: stderr,
		};
	}

	public async detect(
		requireLockfile: boolean = true,
		setCwdToPackageRoot: boolean = false,
	): Promise<boolean> {
		try {
			const root = await this.findRoot(
				requireLockfile ? "yarn.lock" : undefined,
			);
			// Check if yarn is version 1
			if (!(await this.version()).startsWith("1.")) return false;
			if (setCwdToPackageRoot) this.cwd = root;
			return true;
		} catch {
			return false;
		}
	}

	public async version(): Promise<string> {
		const result = await this.command(["-v"]);
		if (!result.success) {
			throw new Error(
				`Could not detect yarn version: ${result.stderr}! Exit code: ${result.exitCode}.`,
			);
		}
		return result.stdout;
	}

	public async overrideDependencies(
		dependencies: Record<string, string>,
	): Promise<CommandResult> {
		let root: string;
		try {
			root = await this.findRoot("yarn.lock");
			const packageJsonPath = path.join(root, "package.json");
			const packageJson = await fs.readJson(packageJsonPath, {
				encoding: "utf8",
			});
			// Add the dependencies to "resolutions" and let yarn figure it out
			let resolutions = packageJson.resolutions ?? {};
			resolutions = {
				...resolutions,
				...dependencies,
			};
			packageJson.resolutions = resolutions;
			await fs.writeJson(packageJsonPath, packageJson, {
				spaces: 2,
				encoding: "utf8",
			});
		} catch (e: any) {
			const stderr = "Error updating root package.json: " + e.message;
			return {
				success: false,
				exitCode: 1,
				stdout: "",
				stderr,
				stdall: stderr,
			};
		}

		// Running "yarn install" in the root dir will install the correct dependencies
		const prevCwd = this.cwd;
		this.cwd = root;
		try {
			return await this.install();
		} finally {
			this.cwd = prevCwd;
		}
	}

	public pack(_options?: PackOptions): Promise<CommandResult> {
		return this.fail(`yarn classic does not support packing tarballs!`);
	}
}
