import _chalk from 'chalk';
import { createRequire } from 'module';
import { version } from '../package.json';
import { chdir } from './chdir';
import { killChildren, trap } from './exec';
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

let lastExitCode: number | null = null;

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
export const setup = async (config: SetupConfig): Promise<number> => {
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
    singleTarget: config.singleTarget,
  });
  return runner.start().then((code) => {
    lastExitCode = code;
    return code;
  });
};

export const sleep = (time: number) => (
  new Promise((resolve) => setTimeout(resolve, time))
);

trap(['EXIT', 'BREAK', 'HUP', 'INT', 'TERM'], (signal) => {
  if (signal !== 'EXIT') {
    console.log('Received', signal);
  }
  killChildren();
  if (signal !== 'EXIT') {
    process.exit(1);
  }
  else if (lastExitCode !== null) {
    process.exit(lastExitCode);
  }
});

const exceptionHandler = (err: unknown) => {
  console.log(err);
  killChildren();
  process.exit(1);
};

process.on('unhandledRejection', exceptionHandler);
process.on('uncaughtException', exceptionHandler);
