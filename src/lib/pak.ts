import { Npm } from "./package-managers/npm";
import type { PackageManager } from "./package-managers/package-manager";
import { Yarn } from "./package-managers/yarn";

export const packageManagers = Object.freeze({
	yarn: Yarn,
	npm: Npm,
});

export interface DetectPackageManagerOptions {
	/** The directory to detect the package manager for */
	cwd?: string;
	/** If this is `false` and no package manager with a matching lockfile was found, another pass is done without requiring one */
	requireLockfile?: boolean;
}

export async function detectPackageManager({
	cwd = process.cwd(),
	requireLockfile = true,
}: DetectPackageManagerOptions = {}): Promise<PackageManager> {
	for (const factory of Object.values(packageManagers)) {
		const pm = new factory();
		pm.cwd = cwd;
		if (await pm.detect(true)) return pm;
	}
	if (!requireLockfile) {
		for (const factory of Object.values(packageManagers)) {
			const pm = new factory();
			pm.cwd = cwd;
			if (await pm.detect(false)) return pm;
		}
	}
	throw new Error("This directory tree does not contain a package.json");
}
