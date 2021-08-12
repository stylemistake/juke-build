#!/usr/bin/env node
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const Juke = require('./.yarn/juke');

Juke.setup({ file: import.meta.url, singleTarget: true });

const yarn = (...args) => Juke.exec('node', [
  Juke.glob('.yarn/releases/*.cjs')[0],
  ...args,
]);

export const YarnTarget = new Juke.Target({
  executes: async () => {
    await yarn('install');
    const pnpApi = require('./.pnp.cjs');
    pnpApi.setup();
  },
});

export const DtsTarget = new Juke.Target({
  dependsOn: [YarnTarget],
  executes: () => yarn(
    'dts-bundle-generator',
      '-o', 'dist/index.d.ts',
      'src/index.ts'
  ),
});

export const BundleTarget = new Juke.Target({
  dependsOn: [YarnTarget],
  executes: async () => {
    const { build } = require('esbuild');
    const { pnpPlugin } = require('@yarnpkg/esbuild-plugin-pnp');
    await build({
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node14',
      external: ['module'],
      plugins: [pnpPlugin()],
      entryPoints: ['src/index.ts'],
      outfile: 'dist/index.js',
    });
    // A very crude implementation of replaceAll
    let content = fs.readFileSync('dist/index.js', 'utf-8');
    while (true) {
      const nextContent = content.replace(process.cwd() + '/.yarn/cache/', '');
      if (content === nextContent) {
        break;
      }
      content = nextContent;
    }
    fs.writeFileSync('dist/index.js', content);
  },
});

export const TscTarget = new Juke.Target({
  dependsOn: [YarnTarget],
  executes: () => yarn('tsc'),
});

export const UpdateLocalParameter = new Juke.Parameter({
  type: 'boolean',
  alias: 'u',
});

export const BuildTarget = new Juke.Target({
  dependsOn: [TscTarget, DtsTarget, BundleTarget],
  executes: async ({ get }) => {
    if (get(UpdateLocalParameter)) {
      Juke.logger.info('Updating local Juke version');
      for (const file of ['index.js', 'index.d.ts']) {
        fs.copyFileSync(`dist/${file}`, `.yarn/juke/${file}`);
      }
    }
  },
});

export const CleanTarget = new Juke.Target({
  executes: async () => {
    await Juke.rm('.yarn/cache', { recursive: true });
    await Juke.rm('.yarn/install-state.gz', { recursive: true });
    await Juke.rm('.pnp.js');
    await Juke.rm('dist', { recursive: true });
    await Juke.rm('node_modules', { recursive: true });
  },
});

export const PrintTarget = new Juke.Target({
  executes: async ({ args }) => {
    console.log({ args });
  },
});

export default BuildTarget;
