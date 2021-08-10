import { toKebabCase, toConstCase, toCamelCase } from './string';

export type ParameterType = (
  string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
);

type StringType = (
  'string'
  | 'string[]'
  | 'number'
  | 'number[]'
  | 'boolean'
  | 'boolean[]'
);

type TypeByString<T extends StringType> = (
  T extends 'string' ? string :
  T extends 'string[]' ? string[] :
  T extends 'number' ? number :
  T extends 'number[]' ? number[] :
  T extends 'boolean' ? boolean :
  T extends 'boolean[]' ? boolean[] :
  never
);

export type ParameterMap = Map<Parameter, unknown[]>;

export type ParameterConfig<T extends StringType> = {
  /**
   * Parameter name, as it would be used in CLI.
   */
  name?: string;

  /**
   * Parameter type, one of:
   * - `string`
   * - `string[]`
   * - `number`
   * - `number[]`
   * - `boolean`
   * - `boolean[]`
   */
  type: T;

  /**
   * Short flag for use in CLI, can only be a single character.
   */
  alias?: string;
};

export interface Parameter<T extends ParameterType = ParameterType> {
  type: StringType;
  name?: string;
  alias?: string;

  // Non-existent property, that is needed for type predicates to work
  // See: https://stackoverflow.com/a/59338460
  __internalType?: T;

  isString(): this is Parameter<string | string[]>;
  isNumber(): this is Parameter<number | number[]>;
  isBoolean(): this is Parameter<boolean | boolean[]>;
  isArray(): this is Parameter<string[] | number[] | boolean[]>;
  toKebabCase(): string | undefined;
  toConstCase(): string | undefined;
  toCamelCase(): string | undefined;
}

type ParameterCtor = {
  new <T extends StringType>(config: ParameterConfig<T>): Parameter<TypeByString<T>>;
};

export const Parameter: ParameterCtor = class implements Parameter {
  public type: StringType;
  public name?: string;
  public alias?: string;

  constructor(config: ParameterConfig<any>) {
    this.type = config.type;
    this.name = config.name;
    this.alias = config.alias;
  }

  isString() {
    return this.type === 'string' || this.type === 'string[]';
  }

  isNumber() {
    return this.type === 'number' || this.type === 'number[]';
  }

  isBoolean() {
    return this.type === 'boolean' || this.type === 'boolean[]';
  }

  isArray() {
    return this.type.endsWith('[]');
  }

  toKebabCase() {
    if (!this.name) return;
    return toKebabCase(this.name);
  }

  toConstCase() {
    if (!this.name) return;
    return toConstCase(this.name);
  }

  toCamelCase() {
    if (!this.name) return;
    return toCamelCase(this.name);
  }
};

export type ParameterCreator = <T extends StringType>(
  config: ParameterConfig<T>
) => Parameter<TypeByString<T>>;

export const createParameter: ParameterCreator = (config) => new Parameter(config);
