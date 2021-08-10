import _chalk from 'chalk';
import { createRequire } from 'module';
import { version } from '../package.json';
import { chdir } from './chdir';
import { logger } from './logger';
import { createParameter, Parameter } from './parameter';
import { runner } from './runner';
import { toKebabCase } from './string';
import { createTarget, Target } from './target';

export { exec, ExitCode } from './exec';
export { glob, rm } from './fs';
export {
  runner,
  logger,
  createParameter,
  Parameter,
  createTarget,
  Target,
  chdir,
};

export const chalk = _chalk;

type SetupConfig = {
  file: string;
  /**
   * If true, CLI will only accept a single target to run and will receive all
   * passed arguments as is (not only flags).
   */
  singleTarget?: boolean;
};

/**
 * Configures Juke Build and starts executing targets.
 *
 * @param config Juke Build configuration.
 * @returns Exit code of the whole runner process.
 */
export const setup = async (config: SetupConfig) => {
  logger.info(`Juke Build version ${version}`)
  if (!config.file) {
    logger.error(`Field 'file' is required in Juke.setup()`);
    process.exit(1);
  }
  let buildModule = await import(config.file);
  const isCommonJs = Boolean(createRequire(config.file).cache[config.file]);
  if (isCommonJs) {
    buildModule = buildModule.default;
  }
  const targets: Target[] = [];
  const parameters: Parameter[] = [];
  for (const name of Object.keys(buildModule)) {
    if (name === 'default') {
      continue;
    }
    const obj = buildModule[name];
    if (obj instanceof Target) {
      if (!obj.name) {
        obj.name = name !== 'Target'
          ? toKebabCase(name.replace(/Target$/, ''))
          : 'target';
      }
      targets.push(obj);
      continue;
    }
    if (obj instanceof Parameter) {
      if (!obj.name) {
        obj.name = name !== 'Parameter'
          ? toKebabCase(name.replace(/Parameter$/, ''))
          : 'parameter';
      }
      parameters.push(obj);
      continue;
    }
  }
  const DefaultTarget = (
    buildModule.default
    || buildModule.DefaultTarget
    || buildModule.Default
  );
  if (DefaultTarget && !(DefaultTarget instanceof Target)) {
    logger.error(`Default export is not a valid 'Target' object.`);
    process.exit(1);
  }
  runner.configure({
    parameters,
    targets,
    default: DefaultTarget,
  });
  return runner.start();
};

export const sleep = (time: number) => (
  new Promise((resolve) => setTimeout(resolve, time))
);
