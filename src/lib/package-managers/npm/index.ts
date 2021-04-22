import execa from "execa";
import { pathExists } from "fs-extra";
import path from "path";
import {
	CommandResult,
	execaReturnValueToCommandResult,
	InstallOptions,
	PackageManager,
	UninstallOptions,
	UpdateOptions,
} from "../package-manager";

export class Npm extends PackageManager {
	/** Installs the given packages using npm */
	public async install(
		packages: string[],
		options: InstallOptions = {},
	): Promise<CommandResult> {
		const args = ["install"];
		if (options.dependencyType === "dev") {
			args.push("--dev");
		}
		if (options.exact) args.push("--save-exact");
		if (options.global) args.push("--global");
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		const result = await execa("npm", args, {
			cwd: this.cwd,
			reject: false,
		});
		return execaReturnValueToCommandResult(result);
	}

	public async uninstall(
		packages: string[],
		options: UninstallOptions = {},
	): Promise<CommandResult> {
		const args = ["uninstall"];
		if (options.dependencyType === "dev") {
			args.push("--dev");
		}
		if (options.global) args.push("--global");
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		const result = await execa("npm", args, {
			cwd: this.cwd,
			reject: false,
		});
		return execaReturnValueToCommandResult(result);
	}

	public async update(
		packages: string[] = [],
		options: UpdateOptions = {},
	): Promise<CommandResult> {
		const args = ["update"];
		if (options.dependencyType === "dev") {
			args.push("--dev");
		}
		if (options.global) args.push("-g");
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		const result = await execa("npm", args, {
			cwd: this.cwd,
			reject: false,
		});
		return execaReturnValueToCommandResult(result);
	}

	public async rebuild(packages: string[] = []): Promise<CommandResult> {
		const args = ["rebuild"];
		if (this.loglevel) {
			args.push("--loglevel", this.loglevel);
		}
		args.push(...packages);

		const result = await execa("npm", args, {
			cwd: this.cwd,
			reject: false,
		});
		return execaReturnValueToCommandResult(result);
	}

	public async detect(): Promise<boolean> {
		try {
			const rootDir = await this.findRoot();
			return pathExists(path.join(rootDir, "package-lock.json"));
		} catch {
			return false;
		}
	}
}
