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

	const dir = path.dirname(toPath);
	fs.mkdirSync(dir, { recursive: true });
	fs.copyFileSync(fromPath, toPath);
}

function copyIfExists(fromRelativePath, toRelativePath) {
	const fromPath = path.join(projectRoot, fromRelativePath);
	if (fs.existsSync(fromPath)) {
		const toPath = path.join(projectRoot, toRelativePath);
		fs.mkdirSync(path.dirname(toPath), { recursive: true });
		fs.copyFileSync(fromPath, toPath);
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
	const missing = required.filter(([from]) => !fs.existsSync(path.join(projectRoot, from)));
	if (missing.length) {
		throw new Error(
			'Missing required build outputs:\n' +
			missing.map(([from]) => `- ${from}`).join('\n')
		);
	}
	required.forEach(([from, to]) => copyFile(from, to));
	optional.forEach(([from, to]) => copyIfExists(from, to));
}

try {
	main();
} catch (err) {
	console.error('postbuild failed:', err instanceof Error ? (err.stack || err.message) : err);
	process.exit(1);
} 