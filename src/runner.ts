import chalk from 'chalk';
import EventEmitter from 'events';
import { parseArgs, prepareArgs } from './argparse';
import { logger } from './logger';
import { ExecutionContext } from './context';
import { compareFiles, File, Glob } from './fs';
import { Parameter } from './parameter';
import { Target } from './target';

export type RunnerEntities = {
  targets: Target[];
  default?: Target;
  parameters?: Parameter[];
};

type ParameterMap = Map<Parameter, unknown>;

export const runner = new class Runner {
  defaultTarget?: Target;
  targets: Target[] = [];
  parameters: Parameter[] = [];
  workers: Worker[] = [];

  register(entities: RunnerEntities) {
    this.targets = entities.targets;
    if (entities.parameters) {
      this.parameters = entities.parameters;
    }
    if (entities.default) {
      this.defaultTarget = entities.default;
    }
  }

  async start() {

    const startedAt = Date.now();

    // Parse arguments
    // ----------------------------------------------------

    type TargetWithArgs = { target: Target; args: string[] };

    const { globalFlags, taskArgs } = prepareArgs(process.argv.slice(2));
    const globalParameterMap = parseArgs(globalFlags, this.parameters);
    const targetsToRun: Map<Target, TargetWithArgs> = new Map();
    for (const [taskName, ...args] of taskArgs) {
      const target = this.targets.find((t) => t.name === taskName);
      if (!target) {
        const nameStr = chalk.cyan(taskName);
        logger.error(`Task '${nameStr}' was not found.`);
        logger.log('Available tasks:', ...this.targets.map((t) => t.name));
        process.exit(1);
      }
      targetsToRun.set(target, { target, args });
    }

    if (targetsToRun.size === 0) {
      if (!this.defaultTarget) {
        logger.error(`No task was provided in arguments.`);
        logger.log('Available tasks:', ...this.targets.map((t) => t.name));
        process.exit(1);
      }
      targetsToRun.set(this.defaultTarget, {
        target: this.defaultTarget,
        args: [],
      });
    }

    // Walk over the dependency graph
    // ----------------------------------------------------

    let toVisit: TargetWithArgs[] = Array.from(targetsToRun.values());
    while (true) {
      const node = toVisit.shift();
      if (!node) {
        break;
      }
      const { target, args } = node;
      for (const dependency of target.dependsOn) {
        if (!targetsToRun.has(dependency)) {
          const node = { target: dependency, args };
          targetsToRun.set(dependency, node);
          toVisit.push(node);
        }
      }
    }

    // Spawn workers
    // ----------------------------------------------------

    for (const { target, args } of targetsToRun.values()) {
      const localParameterMap = parseArgs(args, target.parameters);
      const context: ExecutionContext = {
        get: (parameter): any => {
          const value = localParameterMap.get(parameter)
            ?? globalParameterMap.get(parameter);
          if (parameter.isArray()) {
            return value ?? [];
          }
          else {
            return value?.[0] ?? null;
          }
        },
      };
      const spawnedWorker = new Worker(target, context);
      this.workers.push(spawnedWorker);
      spawnedWorker.onFinish(() => {
        for (const worker of this.workers) {
          if (worker === spawnedWorker) {
            continue;
          }
          worker.resolveDependency(target);
        }
      });
      spawnedWorker.start();
    }
    await Promise.all(this.workers.map((worker) => (
      new Promise<void>((resolve) => worker.onFinish(resolve))
    )));

    const time = ((Date.now() - startedAt) / 1000) + 's';
    const timeStr = chalk.magenta(time);
    logger.action(`Done in ${timeStr}`);
  }
};

class Worker {
  dependencies: Set<unknown>;
  generator?: AsyncGenerator;
  emitter = new EventEmitter();

  constructor(
    readonly target: Target,
    readonly context: ExecutionContext,
  ) {
    this.dependencies = new Set(target.dependsOn);
    this.debugLog('ready');
  }

  resolveDependency(target: Target) {
    this.dependencies.delete(target);
    this.generator?.next();
  }

  start() {
    this.generator = this.process();
    this.generator.next();
  }

  onFinish(fn: () => void) {
    this.emitter.on('finish', fn);
  }

  private debugLog(...args: unknown[]) {
    logger.debug(`${this.target.name}:`, ...args);
  }

  private async *process() {
    const nameStr = chalk.cyan(this.target.name);
    // Wait for dependencies to resolve
    this.debugLog('Waiting for dependencies');
    while (true) {
      if (this.dependencies.size === 0) {
        break;
      }
      yield;
    }
    // Compare inputs and outputs
    this.debugLog('Comparing inputs and outputs');
    const inputs = this.target.inputs.flatMap((path) => (
      path.includes('*')
        ? new Glob(path).toFiles()
        : new File(path)
    ));
    const outputs = this.target.inputs.flatMap((path) => (
      path.includes('*')
        ? new Glob(path).toFiles()
        : new File(path)
    ));
    if (inputs.length > 0) {
      const needsRebuild = compareFiles(inputs, outputs);
      if (!needsRebuild) {
        logger.action(`Skipping '${nameStr}' (up to date)`);
        return;
      } else {
        this.debugLog('Needs rebuild, reason:', needsRebuild);
      }
    } else {
      this.debugLog('Nothing to compare');
    }
    // Execute the task
    if (this.target.executes.length > 0) {
      logger.action(`Starting '${nameStr}'`);
      const startedAt = Date.now();
      for (const fn of this.target.executes) {
        await fn(this.context);
      }
      const time = ((Date.now() - startedAt) / 1000) + 's';
      const timeStr = chalk.magenta(time);
      logger.action(`Finished '${nameStr}' in ${timeStr}`);
    }
    this.emitter.emit('finish');
  };
}
