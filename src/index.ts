import _chalk from 'chalk';
import fs from 'fs';
import { glob as _glob } from 'glob';
import { exec } from './exec';
import { logger } from './logger';
import { createParameter as _createParameter, Parameter, ParameterCreator } from './parameter';
import { runner, RunnerConfig } from './runner';
import { createTarget as _createTarget, Target, TargetCreator } from './target';

export { exec };
export { logger };

export const chalk = _chalk;
export const glob = _glob;

const autoParameters: Parameter[] = [];
const autoTargets: Target[] = [];

/**
 * Configures Juke Build and starts executing targets.
 *
 * @param config Juke Build configuration.
 * @returns Exit code of the whole runner process.
 */
export const setup = (config: RunnerConfig = {}) => {
  config = { ...config };
  if (!config.parameters) {
    config.parameters = autoParameters;
  }
  if (!config.targets) {
    config.targets = autoTargets;
  }
  runner.configure(config);
  return runner.start();
};

export const createTarget: TargetCreator = (config) => {
  const target = _createTarget(config);
  autoTargets.push(target);
  return target;
};

export const createParameter: ParameterCreator = (config) => {
  const parameter = _createParameter(config);
  autoParameters.push(parameter);
  return parameter;
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
