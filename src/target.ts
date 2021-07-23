import { Parameter, ParameterType } from './parameter';

export type ExecutionContext = {
  /** Get parameter value. */
  get: <T extends ParameterType>(parameter: Parameter<T>) => (
    T extends Array<unknown> ? T : T | null
  );
};

type BooleanLike = boolean | null | undefined;
type WithExecutionContext<R> = (context: ExecutionContext) => R | Promise<R>;
type WithOptionalExecutionContext<R> = R | WithExecutionContext<R>;

type DependsOn = WithOptionalExecutionContext<(Target | BooleanLike)[]>
type ExecutesFn = WithExecutionContext<unknown>;
type OnlyWhenFn = WithExecutionContext<BooleanLike>;
export type FileIo = WithOptionalExecutionContext<(string | BooleanLike)[]>;

export class Target {
  public name?: string;
  public dependsOn: DependsOn;
  public executes?: ExecutesFn;
  public inputs: FileIo;
  public outputs: FileIo;
  public parameters: Parameter[];
  public onlyWhen?: OnlyWhenFn;

  constructor(target: Target) {
    this.name = target.name;
    this.dependsOn = target.dependsOn;
    this.executes = target.executes;
    this.inputs = target.inputs;
    this.outputs = target.outputs;
    this.parameters = target.parameters;
    this.onlyWhen = target.onlyWhen;
  }
}

export type TargetConfig = {
  /**
   * Target name. This parameter is required.
   */
  name?: string;
  /**
   * Dependencies for this target. They will be ran before executing this
   * target, and may run in parallel.
   */
  dependsOn?: DependsOn;
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
  executes?: ExecutesFn;
  /**
   * Files that are consumed by this target.
   */
  inputs?: FileIo;
  /**
   * Files that are produced by this target. Additionally, they are also
   * touched every time target finishes executing in order to stop
   * this target from re-running.
   */
  outputs?: FileIo;
  /**
   * Parameters that are local to this task. Can be retrieved via `get`
   * in the executor function.
   */
  parameters?: Parameter[];
  /**
   * Target will run only when this function returns true. It accepts a
   * single argument - execution context.
   */
  onlyWhen?: OnlyWhenFn;
};

export type TargetCreator = (target: TargetConfig) => Target;

export const createTarget: TargetCreator = (target) => new Target({
  name: target.name,
  dependsOn: target.dependsOn ?? [],
  executes: target.executes,
  inputs: target.inputs ?? [],
  outputs: target.outputs ?? [],
  parameters: target.parameters ?? [],
  onlyWhen: target.onlyWhen,
});
