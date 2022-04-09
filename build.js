"use strict";

const { buildJS, compileTS, runTask, write } = require("mefes"),
	ts = options => compileTS({
		entryPoints: ["index.ts"],
		outdir: ".",
		loader: { ".wasm": "binary" },
		...options
	}),
	js = () => buildJS({
		esbuild: {
			entryPoints: ["index.ts"],
			loader: { ".wasm": "binary" },
			outfile: "dist/msgpack-x.min.js"
		}
	});

runTask({
	ts,
	test: () => ts({ format: 'cjs' }),
	js: () => js().then(write)
}, "ts")
