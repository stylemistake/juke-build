import { ExecutionContext } from './context';
import { Parameter } from './parameter';

type BuildFn = (...args: any) => unknown;

export type Target = {
  name?: string;
  dependsOn: Target[];
  inputs: string[];
  outputs: string[];
  executes: BuildFn[];
  parameters: Parameter[];
};

const createTargetBuilder = () => new TargetBuilder({
  dependsOn: [],
  inputs: [],
  outputs: [],
  executes: [],
  parameters: [],
});

export class TargetBuilder {
  constructor(public target: Target) {}

  name(name: string) {
    return new TargetBuilder({
      ...this.target,
      name,
    });
  }

  dependsOn(target: Target) {
    return new TargetBuilder({
      ...this.target,
      dependsOn: [
        ...(this.target.dependsOn || []),
        target,
      ],
    });
  }

  parameter<T extends Parameter>(parameter: T) {
    return new TargetBuilder({
      ...this.target,
      parameters: [
        ...(this.target.parameters || []),
        parameter,
      ],
    });
  }

  executes(fn: (context: ExecutionContext) => void) {
    return new TargetBuilder({
      ...this.target,
      executes: [
        ...(this.target.executes || []),
        fn,
      ],
    });
  }
}

export const createTarget = <T extends TargetBuilder>(
  buildTarget: (_: TargetBuilder) => T,
): Target => {
  let target: Target;
  return new Proxy<any>({}, {
    get: (_, prop) => {
      if (!target) {
        target = buildTarget(createTargetBuilder()).target;
      }
      return (target as any)[prop];
    },
  });
};
