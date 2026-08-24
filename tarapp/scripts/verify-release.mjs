import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appConfig = JSON.parse(readFileSync(join(projectRoot, 'app.json'), 'utf8'));
const splashEntry = appConfig.expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
);

assert(splashEntry, 'app.json must configure expo-splash-screen');

const splash = splashEntry[1];
assert.equal(splash.backgroundColor.toUpperCase(), '#FFFFFF', 'splash background must be pure white');
assert.equal(splash.image, './assets/images/splash-logo.png', 'splash must use the clean logo asset');
assert.equal(splash.imageWidth, 120, 'splash logo width must remain 120');

const splashPath = resolve(projectRoot, splash.image);
assert(existsSync(splashPath), `missing splash asset: ${splashPath}`);

const png = readFileSync(splashPath);
assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', 'splash asset must be a PNG');
assert.equal(png.readUInt32BE(16), 840, 'unexpected splash asset width');
assert.equal(png.readUInt32BE(20), 852, 'unexpected splash asset height');
assert.equal(png[25], 6, 'splash PNG must retain an alpha channel');

const authSource = readFileSync(join(projectRoot, 'src/app/auth.tsx'), 'utf8');
const authBackground = authSource.match(/const AUTH_BACKGROUND = '(#[0-9A-Fa-f]{6})';/)?.[1];
assert(authBackground, 'auth screen must define one shared background color');
assert(
  authSource.includes('backgroundColor: AUTH_BACKGROUND'),
  'auth container must use AUTH_BACKGROUND',
);
assert(
  authSource.includes('bgColor={AUTH_BACKGROUND}'),
  'auth TarLogo cutouts must match the auth background',
);

function run(label, script, args, options = {}) {
  console.log(`\n[release:check] ${label}`);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${label} failed`);
}

const typescriptCli = join(projectRoot, 'node_modules/typescript/bin/tsc');
const expoCli = join(projectRoot, 'node_modules/expo/bin/cli');
const eslintCli = join(projectRoot, 'node_modules/eslint/bin/eslint.js');
const temporaryRoot = realpathSync(tmpdir());
const exportDirectory = mkdtempSync(join(temporaryRoot, 'tarapp-release-check-'));

try {
  run('TypeScript', typescriptCli, ['--noEmit']);
  run('Release UI lint', eslintCli, [
    'src/app/auth.tsx',
    'src/components/TarLogo.tsx',
    '--max-warnings',
    '0',
  ]);
  run('Android production bundle', expoCli, ['export', '--platform', 'android', '--output-dir', exportDirectory], {
    env: { NODE_ENV: 'production' },
  });
} finally {
  const resolvedExportDirectory = realpathSync(exportDirectory);
  const isSafeTemporaryDirectory =
    resolvedExportDirectory.startsWith(`${temporaryRoot}${sep}`) &&
    resolvedExportDirectory.split(sep).at(-1)?.startsWith('tarapp-release-check-');
  assert(isSafeTemporaryDirectory, `refusing to remove unexpected path: ${resolvedExportDirectory}`);
  rmSync(resolvedExportDirectory, { recursive: true, force: true });
}

console.log('\n[release:check] PASS — configuration, auth UI, types, lint, and Android bundle are ready.');
