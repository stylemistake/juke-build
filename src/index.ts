import { createParameter } from './parameter';
import { createTarget } from './target';
import { runner } from './runner';
import { logger } from './logger';

const setup: typeof runner.register = (entities) => {
  runner.register(entities);
  runner.start();
};

export const Juke = {
  createTarget,
  createParameter,
  setup,
};

export {
  createTarget,
  createParameter,
  setup,
  logger,
};
