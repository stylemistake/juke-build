import { ExecutionContext } from './context';
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
  name: string;
  dependsOn?: Target[];
  executes?: BuildFn | BuildFn[];
  inputs?: string[];
  outputs?: string[];
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
