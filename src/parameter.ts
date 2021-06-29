import { camelcase, constcase, spinalcase } from 'stringcase';

export type ParameterType = (
  string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
);

export type ParameterStringType = (
  'string'
  | 'string[]'
  | 'number'
  | 'number[]'
  | 'boolean'
  | 'boolean[]'
);

type ParameterTypeByString<T extends ParameterStringType> = (
  T extends 'string' ? string :
  T extends 'string[]' ? string[] :
  T extends 'number' ? number :
  T extends 'number[]' ? number[] :
  T extends 'boolean' ? boolean :
  T extends 'boolean[]' ? boolean[] :
  never
);

export type ParameterMap = Map<Parameter, unknown[]>;

export type ParameterConfig<T extends ParameterStringType> = {
  /**
   * Parameter name, in "camelCase".
   */
  readonly name: string;

  /**
   * Parameter type, one of:
   * - `string`
   * - `string[]`
   * - `number`
   * - `number[]`
   * - `boolean`
   * - `boolean[]`
   */
  readonly type: T;

  /**
   * Short flag for use in CLI, can only be a single character.
   */
  readonly alias?: string;
};

export type ParameterCreator = <T extends ParameterStringType>(
  config: ParameterConfig<T>
) => Parameter<ParameterTypeByString<T>>;

export const createParameter: ParameterCreator = (config) => (
  new Parameter(
    config.name,
    config.type,
    config.alias)
);

export class Parameter<T extends ParameterType = any> {
  constructor(
    readonly name: string,
    readonly type: ParameterStringType,
    readonly alias?: string,
  ) {}

  isString(): T extends string | string[] ? true : false {
    return (this.type === 'string' || this.type === 'string[]') as any;
  }

  isNumber(): T extends number | number[] ? true : false {
    return (this.type === 'number' || this.type === 'number[]') as any;
  }

  isBoolean(): T extends boolean | boolean[] ? true : false {
    return (this.type === 'boolean' || this.type === 'boolean[]') as any;
  }

  isArray(): T extends Array<unknown> ? true : false {
    return this.type.endsWith('[]') as any;
  }

  toKebabCase() {
    return spinalcase(this.name);
  }

  toConstCase() {
    return constcase(this.name);
  }

  toCamelCase() {
    return camelcase(this.name);
  }
}
