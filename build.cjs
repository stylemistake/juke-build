#!/usr/bin/env node

process.chdir(__dirname);

const Juke = require('./.yarn/juke');

const yarn = (...args) => Juke.exec('node', [
  '.yarn/releases/yarn-2.4.2.cjs',
  ...args,
]);

const rm = (...args) => Juke.exec('rm', args);

const YarnTarget = Juke.createTarget({
  name: 'yarn',
  executes: () => yarn('install'),
});

const DtsTarget = Juke.createTarget({
  name: 'dts',
  dependsOn: [YarnTarget],
  inputs: ['src/**'],
  outputs: ['dist/index.d.ts'],
  executes: () => yarn(
    'run', 'dts-bundle-generator',
      '-o', 'dist/index.d.ts',
      'src/index.ts'
  ),
});

const BundleTarget = Juke.createTarget({
  name: 'bundle',
  dependsOn: [YarnTarget],
  inputs: ['src/**'],
  outputs: ['dist/index.js'],
  executes: () => yarn('run', 'webpack'),
});

const TscTarget = Juke.createTarget({
  name: 'tsc',
  dependsOn: [YarnTarget],
  executes: () => yarn('run', 'tsc'),
});

const BuildTarget = Juke.createTarget({
  name: 'build',
  dependsOn: [TscTarget, DtsTarget, BundleTarget],
});

const Clean = Juke.createTarget({
  name: 'clean',
  executes: async () => {
    await rm('-rf', '.yarn/cache');
    await rm('-rf', '.yarn/install-state.gz');
    await rm('-f', '.pnp.js');
    await rm('-rf', 'dist');
    await rm('-rf', 'node_modules');
  },
});

Juke.setup({
  default: BuildTarget,
});
