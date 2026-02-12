# Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	## __WORK IN PROGRESS__
-->
## __WORK IN PROGRESS__
* Breaking: Minimum supported Node.js version is now 20
* The package is now published as a hybrid ESM/CJS package
* Updated, removed and modernized several dependencies

## 0.11.0 (2024-06-21)
* Add support for Yarn v4

## 0.10.2 (2024-04-17)
* Fix: use `shell: true` option for `npm` on Windows to prevent stalling

## 0.10.1 (2023-11-29)
* Upgraded dependencies to fix a vulnerability in `axios`

## 0.10.0 (2023-10-31)
* Add the install option `force` to pass the `--force` flag to the package manager. The specific behavior depends on the package manager in use.
* `npm.overrideDependencies` now supports `lockfileVersion: 3`

## 0.9.0 (2022-09-19)
* Add support for enumerating workspaces in a monorepo
* Add support for packing a package into an installable tarball (npm and Yarn Berry only)

## 0.8.1 (2022-03-03)
Upgrade dependencies

## 0.8.0 (2022-02-04)
Add the install option `ignoreScripts` which prevents execution of pre/post/install scripts for Yarn Classic and npm

## 0.7.0 (2021-09-15)
* Add support for Yarn Berry (v2+)
* `packageManagers.yarn` now defaults to Yarn Berry. To explicitly use Yarn Classic (v1), use `packageManagers.yarnClassic`.

## 0.6.0 (2021-05-03)
Add option `setCwdToPackageRoot` to automatically set `cwd` to the found package's root dir

## 0.5.0 (2021-05-03)
Add support for additional args that are passed as-is to the package manager.

## 0.4.0 (2021-05-03)
Install commands without packages (`yarn install` / `npm install`) no longer install `devDependencies` by default. To turn this back on, set the `environment` property of the package manager instance to `development`.

## 0.3.1 (2021-04-27)
Fix: `yarn.overrideDependencies` now correctly looks for a `yarn.lock` to determine the root directory

## 0.3.0 (2021-04-26)
Add support for overriding transient dependencies

## 0.2.0 (2021-04-24)
Support directories without a lockfile

## 0.1.0 (2021-04-23)
Initial release
