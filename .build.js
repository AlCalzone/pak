/** Build script to use esbuild without specifying 1000 CLI options */
const { build, cliopts } = require("estrella");
const glob = require("tiny-glob");

const [opts, args] = cliopts.parse(
	["typescript", "Build TypeScript soruces"],
);

if (opts.typescript) {
	(async () => {
		let entryPoints = await glob("./src/**/*.ts");
		entryPoints = entryPoints.filter((ep) => !ep.endsWith(".d.ts"));
		await build({
			entryPoints,
			outdir: "build",
			bundle: false,
			minify: false,
			sourcemap: "external",
			logLevel: "info",
			platform: "node",
			format: "cjs",
			target: "node10",
		});
	})().catch(() => process.exit(1));
}
