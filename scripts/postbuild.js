'use strict';

const fs = require('fs');
const path = require('path');

function copyFile(fromRelativePath, toRelativePath) {
	const projectRoot = path.resolve(__dirname, '..');
	const fromPath = path.join(projectRoot, fromRelativePath);
	const toPath = path.join(projectRoot, toRelativePath);

	if (!fs.existsSync(fromPath)) {
		throw new Error(`Expected build output missing: ${fromRelativePath}`);
	}

	fs.copyFileSync(fromPath, toPath);
}

function main() {
	copyFile('dist/app.js', 'app.js');
	copyFile('dist/sw.js', 'sw.js');
	// Optionally copy maps if present
	if (fs.existsSync(path.resolve(__dirname, '..', 'dist', 'app.js.map'))) {
		fs.copyFileSync(
			path.resolve(__dirname, '..', 'dist', 'app.js.map'),
			path.resolve(__dirname, '..', 'app.js.map')
		);
	}
	if (fs.existsSync(path.resolve(__dirname, '..', 'dist', 'sw.js.map'))) {
		fs.copyFileSync(
			path.resolve(__dirname, '..', 'dist', 'sw.js.map'),
			path.resolve(__dirname, '..', 'sw.js.map')
		);
	}
}

main(); 