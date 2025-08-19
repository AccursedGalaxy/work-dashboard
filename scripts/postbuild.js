'use strict';

const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

function copyFile(fromRelativePath, toRelativePath) {
	const fromPath = path.join(projectRoot, fromRelativePath);
	const toPath = path.join(projectRoot, toRelativePath);

	if (!fs.existsSync(fromPath)) {
		throw new Error(`Expected build output missing: ${fromRelativePath}`);
	}

	fs.copyFileSync(fromPath, toPath);
}

function copyIfExists(fromRelativePath, toRelativePath) {
	const fromPath = path.join(projectRoot, fromRelativePath);
	if (fs.existsSync(fromPath)) {
		fs.copyFileSync(fromPath, path.join(projectRoot, toRelativePath));
	}
}

function main() {
	const required = [
		['dist/app.js', 'app.js'],
		['dist/sw.js', 'sw.js'],
	];
	const optional = [
		['dist/app.js.map', 'app.js.map'],
		['dist/sw.js.map', 'sw.js.map'],
	];
	required.forEach(([from, to]) => copyFile(from, to));
	optional.forEach(([from, to]) => copyIfExists(from, to));
}

try {
	main();
} catch (err) {
	console.error('postbuild failed:', err instanceof Error ? err.message : err);
	process.exit(1);
} 