import chalk from 'chalk';
import EventEmitter from 'events';
import { parseArgs, prepareArgs } from './argparse';
import { ExitError } from './exec';
import { compareFiles, File, Glob } from './fs';
import { logger } from './logger';
import { Parameter, ParameterType } from './parameter';
import { Target } from './target';

export type RunnerConfig = {
  targets?: Target[];
  default?: Target;
  parameters?: Parameter[];
};

export type ExecutionContext = {
  /** Get parameter value. */
  get: <T extends ParameterType>(parameter: Parameter<T>) => (
    T extends Array<unknown> ? T : T | null
  );
};

export const runner = new class Runner {
  defaultTarget?: Target;
  targets: Target[] = [];
  parameters: Parameter[] = [];
  workers: Worker[] = [];

  configure(config: RunnerConfig) {
    this.targets = config.targets ?? [];
    this.parameters = config.parameters ?? [];
    this.defaultTarget = config.default;
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
      spawnedWorker.onFail(() => {
        for (const worker of this.workers) {
          if (worker === spawnedWorker) {
            continue;
          }
          worker.rejectDependency(target);
        }
      });
    }
    const resolutions = await Promise.all(this.workers.map((worker) => (
      new Promise<boolean>((resolve) => {
        worker.onFinish(() => resolve(true));
        worker.onFail(() => resolve(false));
        worker.start();
      })
    )));
    const hasFailedWorkers = resolutions.includes(false);
    // Show done only in happy path
    if (!hasFailedWorkers) {
      const time = ((Date.now() - startedAt) / 1000) + 's';
      const timeStr = chalk.magenta(time);
      logger.action(`Done in ${timeStr}`);
    }
    // Exit with either code 0 or 1 depdending on fail state.
    process.exit(Number(hasFailedWorkers));
  }
};

class Worker {
  dependencies: Set<Target>;
  generator?: AsyncGenerator;
  emitter = new EventEmitter();
  hasFailed = false;

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

  rejectDependency(target: Target) {
    this.dependencies.delete(target);
    this.hasFailed = true;
    this.generator?.next();
  }

  start() {
    this.generator = this.process();
    this.generator.next();
  }

  onFinish(fn: () => void) {
    this.emitter.once('finish', fn);
  }

  onFail(fn: () => void) {
    this.emitter.once('fail', fn);
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
    // Check if we have errored until this point
    if (this.hasFailed) {
      const nameStr = chalk.cyan(this.target.name);
      logger.error(`Target '${nameStr}' failed`);
      this.emitter.emit('fail');
      return;
    }
    // Compare inputs and outputs
    this.debugLog('Comparing inputs and outputs');
    const inputs = this.target.inputs.flatMap((path) => (
      path.includes('*')
        ? new Glob(path).toFiles()
        : new File(path)
    ));
    const outputs = this.target.outputs.flatMap((path) => (
      path.includes('*')
        ? new Glob(path).toFiles()
        : new File(path)
    ));
    if (inputs.length > 0) {
      const needsRebuild = compareFiles(inputs, outputs);
      if (!needsRebuild) {
        logger.info(`Skipping '${nameStr}' (up to date)`);
        this.emitter.emit('finish');
        return;
      } else {
        this.debugLog('Needs rebuild, reason:', needsRebuild);
      }
    } else {
      this.debugLog('Nothing to compare');
    }
    // Check if we have errored until this point
    if (this.hasFailed) {
      const nameStr = chalk.cyan(this.target.name);
      logger.error(`Target '${nameStr}' failed (at file comparison stage)`);
      this.emitter.emit('fail');
      return;
    }
    // Execute the task
    if (this.target.executes.length > 0) {
      logger.action(`Starting '${nameStr}'`);
      const startedAt = Date.now();
      for (const fn of this.target.executes) {
        try {
          await fn(this.context);
        }
        catch (err) {
          const time = ((Date.now() - startedAt) / 1000) + 's';
          const timeStr = chalk.magenta(time);
          if (err instanceof ExitError) {
            const codeStr = chalk.red(err.code);
            logger.error(`Target '${nameStr}' failed in ${timeStr}, exit code: ${codeStr}`);
          }
          else {
            logger.error(`Target '${nameStr}' failed in ${timeStr}, unhandled exception:`);
            console.error(err);
          }
          this.emitter.emit('fail');
          return;
        }
      }
      const time = ((Date.now() - startedAt) / 1000) + 's';
      const timeStr = chalk.magenta(time);
      logger.action(`Finished '${nameStr}' in ${timeStr}`);
    }
    // Touch all targets so that they don't rebuild again
    if (outputs.length > 0) {
      for (const file of outputs) {
        file.touch();
      }
    }
    this.emitter.emit('finish');
  };
}
