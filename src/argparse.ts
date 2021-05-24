import { Parameter, ParameterMap } from './parameter';

type TaskArgs = [
  /** Task name */
  string,
  /** Task arguments */
  ...string[],
];

/**
 * Returns global flags and tasks, which is an array of this format:
 * `[[taskName, ...taskArgs], ...]`
 * @param args List of command line arguments
 */
export const prepareArgs = (args: string[]) => {
  let inGlobalContext = true;
  const globalFlags: string[] = [];
  const taskArgs: TaskArgs[] = [];
  let currentTaskArgs: TaskArgs | undefined;
  while (args.length !== 0) {
    const arg = args.shift();
    if (!arg) {
      continue;
    }
    if (arg === '--') {
      inGlobalContext = false;
      continue;
    }
    if (arg.startsWith('-')) {
      if (inGlobalContext) {
        globalFlags.push(arg);
      }
      else if (currentTaskArgs) {
        currentTaskArgs.push(arg);
      }
    }
    else {
      inGlobalContext = false;
      if (currentTaskArgs) {
        taskArgs.push(currentTaskArgs);
      }
      currentTaskArgs = [arg];
    }
  }
  if (currentTaskArgs) {
    taskArgs.push(currentTaskArgs);
  }
  return { globalFlags, taskArgs };
};

export const parseArgs = (args: string[], parameters: Parameter[]) => {
  args = [...args];
  const parameterMap: ParameterMap = new Map();
  const pushValue = (key: Parameter, value: unknown) => {
    const values = parameterMap.get(key);
    if (!values) {
      parameterMap.set(key, [value]);
      return;
    }
    values.push(value);
  };
  let currentSet: string[] = [];
  let currentSetType: 'long' | 'short' | undefined;
  while (true) {
    if (currentSet.length === 0) {
      const arg = args.shift();
      if (!arg) {
        break;
      }
      if (arg.startsWith('--')) {
        currentSet = [arg.substr(2)];
        currentSetType = 'long';
      }
      else if (arg.startsWith('-')) {
        currentSet = Array.from(arg);
        currentSetType = 'short';
      }
    }
    const arg = currentSet.shift()!;

    // Parsing of short flags
    // ----------------------------------------------------

    if (currentSetType === 'short') {
      const parameter = parameters.find((p) => p.alias === arg);
      // Parameter not found
      if (!parameter) {
        continue;
      }
      if (parameter.isBoolean()) {
        pushValue(parameter, true);
        continue;
      }
      // Rest of parameter types expect a value in the current set
      if (currentSet.length === 0) {
        continue;
      }
      const string = currentSet.join('');
      currentSet = [];
      if (parameter.isNumber()) {
        pushValue(parameter, parseFloat(string));
        continue;
      }
      pushValue(parameter, string);
      continue;
    }

    // Parsing of short flags
    // ----------------------------------------------------

    // Try to break the long flag into name/value
    const equalsIndex = arg.indexOf('=');
    let name = arg;
    let value: string | null = null;
    if (equalsIndex >= 0) {
      name = arg.substr(0, equalsIndex);
      value = arg.substr(equalsIndex + 1);
      if (value === '') {
        value = null;
      }
    }
    const parameter = parameters.find((p) => (
      p.name === name
      || p.toKebabCase() === name
      || p.toCamelCase() === name
    ));
    if (!parameter) {
      continue;
    }
    if (parameter.isBoolean()) {
      pushValue(parameter,
        // True if no equals sign
        equalsIndex < 0
        // True if non null and non falsy value
        || (value !== null && value !== '0' && value !== 'false'));
      continue;
    }
    // Rest of parameter types expect a value
    if (value === null) {
      continue;
    }
    if (parameter.isNumber()) {
      pushValue(parameter, parseFloat(value));
      continue;
    }
    pushValue(parameter, value);
    continue;
  }
  return parameterMap;
};
