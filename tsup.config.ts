import { defineConfig } from 'tsup'

export default defineConfig({
	clean: true,
	dts: true,
	entry: ['index.ts'],
	format: ['esm', 'iife'],
	minify: 'terser',
	sourcemap: false,
	loader: { '.wasm': 'binary' }
})