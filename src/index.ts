import _chalk from 'chalk';
import fs from 'fs';
import { glob as _glob } from 'glob';
import { version } from '../package.json';
import { exec, ExitCode } from './exec';
import { logger } from './logger';
import { createParameter, Parameter } from './parameter';
import { runner } from './runner';
import { toKebabCase } from './string';
import { createTarget, Target } from './target';

export { exec, ExitCode, runner, logger, createParameter, createTarget };

export const chalk = _chalk;
export const glob = _glob;

type SetupConfig = {
  file: string;
};

/**
 * Configures Juke Build and starts executing targets.
 *
 * @param config Juke Build configuration.
 * @returns Exit code of the whole runner process.
 */
export const setup = (config: SetupConfig) => {
  logger.info(`Juke Build version ${version}`)
  const buildModule = import(config.file);
  buildModule.then((buildModule) => {
    const targets: Target[] = [];
    const parameters: Parameter[] = [];
    for (const name of Object.keys(buildModule)) {
      const obj = buildModule[name];
      if (obj instanceof Target) {
        if (!obj.name) {
          obj.name = toKebabCase(name.replace(/Target$/, ''));
        }
        targets.push(obj);
        continue;
      }
      if (obj instanceof Parameter) {
        if (!obj.name) {
          obj.name = toKebabCase(name.replace(/Parameter$/, ''));
        }
        parameters.push(obj);
        continue;
      }
    }
    runner.configure({
      parameters,
      targets,
      default: buildModule.default,
    });
    runner.start();
  });
};

export const sleep = (time: number) => (
  new Promise((resolve) => setTimeout(resolve, time))
);

/**
 * Resolves a glob pattern and returns files that are safe
 * to call `stat` on.
 */
export const resolveGlob = (globPath: string) => {
  const unsafePaths = glob.sync(globPath, {
    strict: false,
    silent: true,
  });
  const safePaths = [];
  for (let path of unsafePaths) {
    try {
      fs.statSync(path);
      safePaths.push(path);
    }
    catch {}
  }
  return safePaths;
};
