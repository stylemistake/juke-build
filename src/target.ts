import { Parameter } from './parameter';

type BuildFn = (...args: any) => unknown;

export type Target = {
  name: string;
  dependsOn: Target[];
  executes: BuildFn[];
  inputs: string[];
  outputs: string[];
  parameters: Parameter[];
};

type TargetConfig = {
  /**
   * Target name. This parameter is required.
   */
  name: string;
  /**
   * Dependencies for this target. They will be ran before executing this
   * target, and may run in parallel.
   */
  dependsOn?: Target[];
  /**
   * Function that is delegated to the execution engine for building this
   * target. It is normally an async function, which accepts a single
   * argument - execution context (contains `get` for interacting with
   * parameters).
   *
   * @example
   * executes: async ({ get }) => {
   *   console.log(get(Parameter));
   * },
   */
  executes?: BuildFn | BuildFn[];
  /**
   * Files that are consumed by this target.
   */
  inputs?: string[];
  /**
   * Files that are produced by this target. Additionally, they are also
   * touched every time target finishes executing in order to stop
   * this target from re-running.
   */
  outputs?: string[];
  /**
   * Parameters that are local to this task. Can be retrieved via `get`
   * in the executor function.
   */
  parameters?: Parameter[];
};

export const createTarget = (target: TargetConfig): Target => {
  let executes: Target['executes'] = [];
  if (target.executes) {
    if (Array.isArray(target.executes)) {
      executes = target.executes;
    }
    else {
      executes = [target.executes];
    }
  }
  return {
    name: target.name,
    dependsOn: target.dependsOn ?? [],
    executes,
    inputs: target.inputs ?? [],
    outputs: target.outputs ?? [],
    parameters: target.parameters ?? [],
  }
};
