import chalk from 'chalk';
import EventEmitter from 'events';
import { parseArgs, prepareArgs } from './argparse';
import { ExitError } from './exec';
import { compareFiles, File, Glob } from './fs';
import { logger } from './logger';
import { Parameter } from './parameter';
import { ExecutionContext, FileIo, Target } from './target';

export type RunnerConfig = {
  targets?: Target[];
  default?: Target;
  parameters?: Parameter[];
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

    type TargetMeta = {
      args: string[];
      context?: ExecutionContext;
      dependsOn?: Target[];
    };

    const { globalFlags, taskArgs } = prepareArgs(process.argv.slice(2));
    const globalParameterMap = parseArgs(globalFlags, this.parameters);
    const targetsToRun: Map<Target, TargetMeta> = new Map();
    for (const [taskName, ...args] of taskArgs) {
      const target = this.targets.find((t) => t.name === taskName);
      if (!target) {
        const nameStr = chalk.cyan(taskName);
        logger.error(`Task '${nameStr}' was not found.`);
        logger.log('Available tasks:', ...this.targets.map((t) => t.name));
        process.exit(1);
      }
      targetsToRun.set(target, { args });
    }

    if (targetsToRun.size === 0) {
      if (!this.defaultTarget) {
        logger.error(`No task was provided in arguments.`);
        logger.log('Available tasks:', ...this.targets.map((t) => t.name));
        process.exit(1);
      }
      targetsToRun.set(this.defaultTarget, {
        args: [],
      });
    }

    // Walk over the dependency graph and create execution contexts
    // ----------------------------------------------------

    let toVisit: [Target, TargetMeta][] = Array.from(targetsToRun.entries());
    while (true) {
      const node = toVisit.shift();
      if (!node) {
        break;
      }
      const [target, meta] = node;
      // Parse arguments and initialize the context
      if (!meta.context) {
        const localParameterMap = parseArgs(meta.args, target.parameters);
        meta.context = {
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
      }
      // Resolve dependencies
      if (!meta.dependsOn) {
        const optionalDependsOn = (
          (typeof target.dependsOn === 'function'
            ? await target.dependsOn(meta.context)
            : target.dependsOn)
          || []
        );
        meta.dependsOn = optionalDependsOn.filter((dep) => (
          typeof dep === 'object' && dep !== null
        )) as Target[];
      }
      // Add each dependency as a tree node to visit
      for (const dependency of meta.dependsOn) {
        if (!targetsToRun.has(dependency)) {
          const depMeta = { args: meta.args };
          targetsToRun.set(dependency, depMeta);
          toVisit.push([dependency, depMeta]);
        }
        else {
          logger.debug('Dropped a possible circular dependency', dependency);
        }
      }
    }

    // Spawn workers
    // ----------------------------------------------------

    for (const [target, meta] of targetsToRun.entries()) {
      const context = meta.context!;
      const dependsOn = meta.dependsOn!;
      const spawnedWorker = new Worker(target, context, dependsOn);
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
    // Exit code 0 or 1 depdending on the fail state.
    return Number(hasFailedWorkers);
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
    readonly dependsOn: Target[],
  ) {
    this.dependencies = new Set(dependsOn);
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
    // Check onlyWhen condition
    if (this.target.onlyWhen) {
      const result = await this.target.onlyWhen(this.context);
      if (!result) {
        logger.info(`Skipping '${nameStr}' (condition unmet)`);
        this.emitter.emit('finish');
        return;
      }
      this.debugLog('Needs rebuild based on onlyWhen condition');
    }
    // Compare inputs and outputs
    this.debugLog('Comparing inputs and outputs');
    const fileMapper = async (fileIo: FileIo) => {
      const optionalPaths = (
        (typeof fileIo === 'function'
          ? await fileIo(this.context)
          : fileIo)
        || []
      );
      const paths = optionalPaths.filter((path) => (
        typeof path === 'string'
      )) as string[];
      return paths.flatMap((path) => (
        path.includes('*')
          ? new Glob(path).toFiles()
          : new File(path)
      ));
    };
    const inputs = await fileMapper(this.target.inputs);
    const outputs = await fileMapper(this.target.outputs);
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
    if (this.target.executes) {
      logger.action(`Starting '${nameStr}'`);
      const startedAt = Date.now();
      try {
        await this.target.executes(this.context);
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
