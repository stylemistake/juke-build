import chalk from 'chalk';
import fs from 'fs';
import glob from 'glob';
import { exec } from './exec';
import { logger } from './logger';
import { createParameter as _createParameter, Parameter } from './parameter';
import { runner, RunnerConfig } from './runner';
import { createTarget as _createTarget, Target } from './target';

export { exec, chalk, glob, logger };

const autoParameters: Parameter[] = [];
const autoTargets: Target[] = []

export const setup = (config: RunnerConfig = {}) => {
  config = { ...config };
  if (!config.parameters) {
    config.parameters = autoParameters;
  }
  if (!config.targets) {
    config.targets = autoTargets;
  }
  runner.configure(config);
  runner.start();
};

export const createTarget: typeof _createTarget = (config) => {
  const target = _createTarget(config);
  autoTargets.push(target);
  return target;
};

export const createParameter: typeof _createParameter = (config) => {
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
