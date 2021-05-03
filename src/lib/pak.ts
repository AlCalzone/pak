import { Npm } from "./package-managers/npm";
import type { PackageManager } from "./package-managers/package-manager";
import { Yarn } from "./package-managers/yarn";

export const packageManagers = Object.freeze({
	yarn: Yarn,
	npm: Npm,
});

export interface DetectPackageManagerOptions {
	/** The working directory for the package manager. Detection will start from here upwards. */
	cwd?: string;
	/** Whether to change the `cwd` to operate in the package directory instead of the current package. */
	setCwdToPackageRoot?: boolean;
	/** If this is `false` and no package manager with a matching lockfile was found, another pass is done without requiring one */
	requireLockfile?: boolean;
}

export async function detectPackageManager({
	cwd = process.cwd(),
	setCwdToPackageRoot = false,
	requireLockfile = true,
}: DetectPackageManagerOptions = {}): Promise<PackageManager> {
	for (const factory of Object.values(packageManagers)) {
		const pm = new factory();
		pm.cwd = cwd;
		if (await pm.detect(true, setCwdToPackageRoot)) return pm;
	}
	if (!requireLockfile) {
		for (const factory of Object.values(packageManagers)) {
			const pm = new factory();
			pm.cwd = cwd;
			if (await pm.detect(false, setCwdToPackageRoot)) return pm;
		}
	}
	throw new Error("This directory tree does not contain a package.json");
}
