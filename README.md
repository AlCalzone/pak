# pak

Programmatic wrapper around popular Node.js package managers

Roadmap:

-   [x] `npm`
-   [x] `yarn 1`

## Usage

### Auto-detect the correct package-manager to use

```ts
import { detectPackageManager } from "pak";

async function main() {
	// Use the current working directory
	const pak = await detectPackageManager();

	// Or use a different directory. The package manager will default to that dir
	const pak = await detectPackageManager("/path/to/dir");
}
```

### Create an instance of a specific package manager

```ts
import { packageManagers } from "pak";
const pak = new packageManagers.npm();
```

### Package manager properties

All package managers share the following properties:
| Property | Type | Description |
---------------------------------------------------------------- | -------- | --------- |
| `cwd` | `string` | The directory to run the package manager commands in. Defaults to `process.cwd()` |
| `loglevel` | `"info" \| "verbose" \| "warn" \| "error" \| "silent"` | Which loglevel to pass to the package manager |
| `stdout` | `WritableStream` | A stream to pipe the command's `stdout` into. |
| `stderr` | `WritableStream` | A stream to pipe the command's `stderr` into. |
| `stdall` | `WritableStream` | A stream to pipe the command's `stdout` and `stderr` into in the order the output comes. |

### Install one or more packages

```ts
const result = await pak.install(packages, options);
```

-   `packages` is an array of package specifiers, like `["pak", "fs-extra"]` or `["semver@1.2.3"]`
-   `options`: See [#common-options](common options) for details.

### Uninstall one or more packages

```ts
const result = await pak.uninstall(packages, options);
```

-   `packages` is an array of package specifiers, like `["pak", "fs-extra"]` or `["semver@1.2.3"]`
-   `options`: See [#common-options](common options) for details.

### Update one or more packages

```ts
const result = await pak.update(packages, options);
```

-   `packages` is an array of package names, like `["pak", "fs-extra"]`. If no packages are given, all packages in the current workspace are updated.
-   `options`: See [#common-options](common options) for details.

### Recompile native packages

```ts
const result = await pak.rebuild(packages, options);
```

-   `packages` is an array of package names, like `["pak", "fs-extra"]`. If no packages are given, all packages in the current workspace are rebuilt.
-   `options`: See [#common-options](common options) for details.

### Result object

The returned value is an object with the following properties:

```ts
interface CommandResult {
	/** Whether the command execution was successful */
	success: boolean;
	/** The exit code of the command execution */
	exitCode: number;
	/** The captured stdout */
	stdout: string;
	/** The captured stderr */
	stderr: string;
}
```

### Common options

These options are used to influence the commands' behavior. All options are optional:

| Option           | Type              | Description                                                      | Default  | Commands  |
| ---------------- | ----------------- | ---------------------------------------------------------------- | -------- | --------- |
| `dependencyType` | `"prod" \| "dev"` | Whether to install a production or dev dependency.               | `"prod"` | all       |
| `global`         | `boolean`         | Whether to install the package globally.                         | `false`  | all       |
| `exact`          | `boolean`         | Whether exact versions should be used instead of `"^ver.si.on"`. | `false`  | `install` |

### Find the nearest parent directory with a `package.json`

```ts
const dir = await pak.findRoot();
```

Returns a string with a path to the nearest parent directory (including `cwd`) that contains a `package.json`. Throws if none was found.

### Stream the command output

You can stream the command output (`stdout`, `stderr` or both) during the command execution, as opposed to getting the entire output at the end. To do so,
set the `stdout`, `stderr` and/or `stdall` properties of the package manager instance to a writable stream. Example:

```ts
import { PassThrough } from "stream";
import { packageManagers } from "../../src/index";

const pak = new packageManagers.npm(); // or the automatically detected one
pak.stdall = new PassThrough().on("data", (data) => {
	// For example, log to console - or do something else with the data
	console.log(data.toString("utf8"));
});

// execute commands
```

### Get the version of the package manager

```ts
const version = await pak.version();
```

Returns a string with the package manager's version.
