import * as fs from "fs-extra";
import * as path from "path";
import {
	CommandResult,
	InstallOptions,
	PackageManager,
	PackOptions,
	UninstallOptions,
	UpdateOptions,
} from "../package-manager.js";

function setLoglevel(_args: string[], _loglevel: PackageManager["loglevel"]) {
	// yarn berry doesn't allow setting the log level
}

export class YarnBerry extends PackageManager {
	/** Executes a "raw" yarn command */
	private command(args: string[]): Promise<CommandResult> {
		return this.exec("yarn", args);
	}

	/**
	 * Installs the given packages using `yarn add`. If no packages are given, `yarn install` is executed in the cwd.
	 */
	public install(
		packages: string[] = [],
		options: InstallOptions = {},
	): Promise<CommandResult> {
		const args: string[] = [];
		if (options.global) {
			return this.fail(`yarn berry does not support global installs!`);
		}

		if (packages.length > 0) {
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
			// if (this.environment === "production") {
			// 	args.push("--production");
			// }
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
		if (options.global) {
			return this.fail(`yarn berry does not support global uninstalls!`);
		}

		args.push("remove");
		args.push(...packages);

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

	public rebuild(packages: string[] = []): Promise<CommandResult> {
		const args = ["rebuild"];
		args.push(...packages);
		setLoglevel(args, this.loglevel);

		return this.command(args);
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
			const version = await this.version();
			if (
				!version.startsWith("2.") &&
				!version.startsWith("3.") &&
				!version.startsWith("4.")
			) {
				return false;
			}

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

	public async pack({
		targetDir = this.cwd,
		workspace = ".",
	}: PackOptions = {}): Promise<CommandResult> {
		const workspaceDir = path.join(this.cwd, workspace);
		// Make sure the target dir exists
		await fs.ensureDir(targetDir);

		// Yarn expects the path to the file to be generated, unlike npm. So we need to determine it ourselves.
		const packageJsonPath = path.join(workspaceDir, "package.json");
		const packageJson = await fs.readJson(packageJsonPath, "utf8");
		const packageName = packageJson.name
			.replace("/", "-")
			.replace(/^@/, "");
		const version = packageJson.version;
		const targetPath = path.join(
			targetDir,
			`${packageName}-${version}.tgz`,
		);

		const prevCwd = this.cwd;
		this.cwd = workspaceDir;
		try {
			const result = await this.command(["pack", "--out", targetPath]);
			return {
				...result,
				// Yarn outputs a lot, not only the target path of the file. Manually return the absolute path.
				stdout: targetPath,
			};
		} finally {
			this.cwd = prevCwd;
		}
	}
}
