import axios from "axios";
import execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";
import {
	CommandResult,
	execaReturnValueToCommandResult,
	InstallOptions,
	PackageManager,
	UninstallOptions,
	UpdateOptions,
} from "../package-manager";

const exactVersionRegex = /.+@\d+/;

interface ResolvedDependency {
	version: string;
	integrity: string;
	tarball: string;
	dependencies: Record<string, string>;
}

function fail(message: string): CommandResult {
	return {
		success: false,
		exitCode: 1,
		stdout: "",
		stderr: message,
		stdall: message,
	};
}

async function resolveDependency(
	dependency: string,
	version: string,
): Promise<ResolvedDependency> {
	let reg: Record<string, any>;
	try {
		reg = (await axios.get(`https://registry.npmjs.org/${dependency}`))
			.data;
	} catch (e: any) {
		throw new Error(
			`Failed to download package info from npm registry: ${e.message}`,
		);
	}

	if (version in reg.versions) {
		const versionInfo = reg.versions[version];
		return {
			version: versionInfo.version,
			dependencies: versionInfo.dependencies,
			integrity: versionInfo.dist.integrity,
			tarball: versionInfo.dist.tarball,
		};
	} else {
		throw new Error(
			`${dependency}@${version} was not found in the npm registry!`,
		);
	}
}

function overrideV1(
	original: Record<string, any>,
	override: ResolvedDependency,
): Record<string, any> {
	const ret: Record<string, any> = {
		...original,
	};
	ret.version = override.version;
	if (ret.tarball) {
		ret.tarball = override.tarball;
	} else {
		ret.resolved = override.tarball;
		if (override.integrity) ret.integrity = override.integrity;
	}
	ret.requires = override.dependencies;
	return ret;
}

function overrideV2(
	original: Record<string, any>,
	override: ResolvedDependency,
): Record<string, any> {
	const ret: Record<string, any> = {
		...original,
	};
	ret.version = override.version;
	if (ret.tarball) {
		ret.tarball = override.tarball;
	} else {
		ret.resolved = override.tarball;
		if (override.integrity) ret.integrity = override.integrity;
		else delete ret.integrity;
	}
	ret.dependencies = override.dependencies;
	return ret;
}

function walkLockfileV1(
	root: Record<string, any>,
	dir: string,
	overrides: Record<string, ResolvedDependency>,
	affectedPackageJsons: Set<string>,
) {
	if (!("dependencies" in root)) return;
	for (const dep of Object.keys(root.dependencies)) {
		if (dep in overrides) {
			// Replace the overrides
			root.dependencies[dep] = overrideV1(
				root.dependencies[dep],
				overrides[dep],
			);
		} else {
			const depRoot = root.dependencies[dep];
			if ("requires" in depRoot) {
				let wasChanged = false;
				for (const [ovrr, { version }] of Object.entries(overrides)) {
					if (ovrr in depRoot.requires) {
						depRoot.requires[ovrr] = version;
						wasChanged = true;
					}
				}
				if (wasChanged) {
					// The package is affected, update it and remember where its package.json is
					affectedPackageJsons.add(
						path.join(dir, "node_modules", dep, "package.json"),
					);
				}
			}

			// and recursively continue with the other packages that might use them
			walkLockfileV1(
				root.dependencies[dep],
				path.join(dir, "node_modules", dep),
				overrides,
				affectedPackageJsons,
			);
		}
	}
}

function walkLockfileV2(
	root: Record<string, any>,
	dir: string,
	overrides: Record<string, ResolvedDependency>,
	affectedPackageJsons: Set<string>,
) {
	if (!("packages" in root)) return;
	// Lockfile v2 stores a package structure
	for (const pkg of Object.keys(root.packages)) {
		const pkgRoot = root.packages[pkg];
		const name =
			pkgRoot.name ?? pkg.substr(pkg.lastIndexOf("node_modules/") + 13);

		if (name in overrides) {
			// Replace the overrides
			root.packages[pkg] = overrideV2(
				root.packages[pkg],
				overrides[name],
			);
		} else if ("dependencies" in pkgRoot) {
			let wasChanged = false;
			for (const [ovrr, { version }] of Object.entries(overrides)) {
				if (ovrr in pkgRoot.dependencies) {
					pkgRoot.dependencies[ovrr] = version;
					wasChanged = true;
				}
			}
			if (wasChanged) {
				// The package is affected, update it and remember where its package.json is
				affectedPackageJsons.add(path.join(dir, pkg, "package.json"));
			}
		}
	}
}

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
		packages: string[] = [],
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

		if (!packages.length && this.environment === "production") {
			args.push("--production");
		}

		if (options.additionalArgs) {
			args.push(...options.additionalArgs);
		}

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

		if (options.additionalArgs) {
			args.push(...options.additionalArgs);
		}

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

	public async detect(
		requireLockfile: boolean = true,
		setCwdToPackageRoot: boolean = false,
	): Promise<boolean> {
		try {
			const root = await this.findRoot(
				requireLockfile ? "package-lock.json" : undefined,
			);
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
				`Could not detect npm version: ${result.stderr}! Exit code: ${result.exitCode}.`,
			);
		}
		return result.stdout;
	}

	public async overrideDependencies(
		dependencies: Record<string, string>,
	): Promise<CommandResult> {
		// In order to override dependency versions in npm, we need to do the following things:
		// 1. Update the definition(s) of the updated package in package-lock.json. These are objects under ...->"dependencies"
		// 2. Find all packages that use the package, edit their local package.json to point to the new version
		// 3. run `npm install` in the root dir. This updates package-lock.json with the versions from the local package.json files

		let root: string;
		let rootPackageJsonPath: string;
		let rootPackageLockPath: string;
		// let rootPackageJson: Record<string, any>;
		let rootPackageLock: Record<string, any>;

		try {
			root = await this.findRoot("package-lock.json");
			rootPackageJsonPath = path.join(root, "package.json");
			// rootPackageJson = await fs.readJson(rootPackageJsonPath, {
			// 	encoding: "utf8",
			// });
			rootPackageLockPath = path.join(root, "package-lock.json");
			rootPackageLock = await fs.readJson(rootPackageLockPath, {
				encoding: "utf8",
			});
		} catch (e: any) {
			return fail(
				`Error loading root package.json and package-lock.json: ${e.message}`,
			);
		}

		if (
			rootPackageLock.lockfileVersion !== 1 &&
			rootPackageLock.lockfileVersion !== 2
		) {
			return fail(
				`Lockfile version ${rootPackageLock.lockfileVersion} is not supported!`,
			);
		}

		// Look up the information for our overrides
		const overrides: Record<string, ResolvedDependency> = {};
		for (const [dep, version] of Object.entries(dependencies)) {
			try {
				overrides[dep] = await resolveDependency(dep, version);
			} catch (e: any) {
				return fail(e.message);
			}
		}

		// Walk through the lockfile, edit it and find the package.jsons we need to update
		const affectedPackageJsons = new Set<string>();
		affectedPackageJsons.add(rootPackageJsonPath);
		if (rootPackageLock.lockfileVersion === 2) {
			walkLockfileV2(
				rootPackageLock,
				root,
				overrides,
				affectedPackageJsons,
			);
		}
		if (rootPackageLock.lockfileVersion <= 2) {
			// V2 contains backwards compatibility data for V1 we also need to edit
			walkLockfileV1(
				rootPackageLock,
				root,
				overrides,
				affectedPackageJsons,
			);
		}

		try {
			for (const packPath of affectedPackageJsons) {
				// Update each possibly affected package.json
				const pack = await fs.readJson(packPath, {
					encoding: "utf8",
				});
				if (!pack.dependencies) continue;
				let wasChanged = false;
				for (const [dep, { version }] of Object.entries(overrides)) {
					if (dep in pack.dependencies) {
						pack.dependencies[dep] = version;
						wasChanged = true;
					}
				}
				// And save it
				if (wasChanged) {
					await fs.writeJson(packPath, pack, {
						spaces: 2,
						encoding: "utf8",
					});
				}
			}

			// Save package-lock.json last
			await fs.writeJson(rootPackageLockPath, rootPackageLock, {
				spaces: 2,
				encoding: "utf8",
			});
		} catch (e: any) {
			return fail(`Error updating package files: ${e.message}`);
		}

		// Running "npm install" in the root dir will now install the correct dependencies
		const prevCwd = this.cwd;
		this.cwd = root;
		try {
			debugger;
			const ret = await this.install();
			// Force npm to restore the original structure
			await this.command(["dedupe"]);
			return ret;
		} finally {
			this.cwd = prevCwd;
		}
	}
}
