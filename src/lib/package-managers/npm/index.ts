import execa from "execa";
import {
	CommandResult,
	execaReturnValueToCommandResult,
	InstallOptions,
	PackageManager,
	UninstallOptions,
	UpdateOptions,
} from "../package-manager";

const exactVersionRegex = /.+@\d+/;

export class Npm extends PackageManager {
	/** Executes a "raw" npm command */
	private async command(
		args: string[],
		options: execa.Options<string> = {},
	): Promise<CommandResult> {
		const promise = execa("npm", args, {
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

	/** Installs the given packages using npm */
	public install(
		packages: string[],
		options: InstallOptions = {},
	): Promise<CommandResult> {
		const args = ["install"];
		if (options.dependencyType === "dev") {
			args.push("--save-dev");
		}
		if (options.exact || packages.some((p) => exactVersionRegex.test(p))) {
			args.push("--save-exact");
		}
		if (options.global) args.push("--global");
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		return this.command(args);
	}

	public uninstall(
		packages: string[],
		options: UninstallOptions = {},
	): Promise<CommandResult> {
		const args = ["uninstall"];
		if (options.dependencyType === "dev") {
			args.push("--save-dev");
		}
		if (options.global) args.push("--global");
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		return this.command(args);
	}

	public update(
		packages: string[] = [],
		options: UpdateOptions = {},
	): Promise<CommandResult> {
		const args = ["update"];
		if (options.dependencyType === "dev") {
			args.push("--save-dev");
		}
		if (options.global) args.push("-g");
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		return this.command(args);
	}

	public rebuild(packages: string[] = []): Promise<CommandResult> {
		const args = ["rebuild"];
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		return this.command(args);
	}

	public async detect(requireLockfile: boolean = true): Promise<boolean> {
		try {
			await this.findRoot(
				requireLockfile ? "package-lock.json" : undefined,
			);
			return true;
		} catch {
			return false;
		}
	}

	public async version(): Promise<string> {
		const result = await this.command(["-v"]);
		if (!result.success) {
			throw new Error(
				`Could not detect npm version: ${result.stderr}! Exit code: ${result.exitCode}.`,
			);
		}
		return result.stdout;
	}
}
