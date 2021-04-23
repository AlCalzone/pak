import { Npm } from "./package-managers/npm";
import type { PackageManager } from "./package-managers/package-manager";
import { Yarn } from "./package-managers/yarn";

export const packageManagers = Object.freeze({
	yarn: Yarn,
	npm: Npm,
});

export async function detectPackageManager(
	cwd: string = process.cwd(),
): Promise<PackageManager> {
	for (const factory of Object.values(packageManagers)) {
		const pm = new factory();
		pm.cwd = cwd;
		if (await pm.detect()) return pm;
	}
	throw new Error("This directory tree does not contain a package.json");
}
