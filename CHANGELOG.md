# Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	## __WORK IN PROGRESS__
-->
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
