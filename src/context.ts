import { Parameter, ParameterType } from './parameter';

export type ExecutionContext = {
  /** Get parameter value. */
  get: <T extends ParameterType>(parameter: Parameter<T>) => (
    T extends Array<unknown> ? T : T | null
  );
};
