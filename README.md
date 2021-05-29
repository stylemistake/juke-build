![JUKE build](./assets/juke-build.png)

> The AKE-less Build System for JavaScript and Node.js.
> Inspired by [NUKE](https://nuke.build/).

This project is a work in progress, check

## How to build

```
yarn install
yarn build
```

## General usage

Copy contents of the `dist` folder anywhere you want to use Juke, then
create a javascript file for the build script with the following contents:

```ts
const Juke = require('./juke');

// TODO: Declare targets here

// Build runs after calling setup.
Juke.setup();
```

### Create targets

Targets are simple containers for your build scripts, that define how it should
run in relation to other targets. It may have dependencies on other targets,
required parameters and various other conditions for executing the target.

All targets must have a `name`, which is used in CLI for specifying the target.

```ts
const Target = Juke.createTarget({
  name: 'foo',
  executes: async () => {
    console.log('Hello, world!');
  },
  ...
});
```

### Declare dependencies

```ts
const Target = Juke.createTarget({
  dependsOn: [OtherTarget],
  ...
});
```

### Set a default target

When no target is provided via CLI, Juke will execute the default target.

```ts
const Target = Juke.createTarget({ ... });

Juke.setup({
  default: Target,
});
```

### Create parameters

Available parameter types are: `string`, `number`, `boolean`.
Add a `[]` suffix to the type to make it an array.

To fetch parameter's value, you must use a `get` helper in execution context.

```ts
const Parameter = Juke.createParameter({
  name: 'foo',
  type: 'string[]',
});

const Target = Juke.createTarget({
  name: 'foo',
  parameters: [Parameter],
  executes: async ({ get }) => {
    const values = get(Parameter);
    console.log('Parameter values:', values);
  },
  ...
});
```

### Declare file inputs and outputs

If your target consumes and creates files, you can declare them on the target,
so it would check whether it actually needs to rebuild.

If any input file is newer than output files, target will rebuild, otherwise
it will be skipped.

Supports globs.

```ts
const Target = Juke.createTarget({
  inputs: ['package.json', 'src/**/*.js'],
  outputs: ['dest/bundle.js'],
  ...
});
```

### Run the build

You can build targets by specifying their names via CLI.

Every flag that you specify via CLI is transformed into parameters, and their
name must be written in `--kebab-case`.

```
./build.js [globalFlags] task-1 [flagsLocalToTask1] task-2 [flagsLocalToTask2]
```

To specify an array of parameters, you can simply specify the same flag
multiple times:

```
./build.js task-1 --foo=A --foo=B
```

You can also specify parameters via the environment. Environment variable
names must be written in `CONSTANT_CASE`. If this parameter is an array,
you can use a comma to separate the values.

```
FOO=A,B ./build.js task-1
```

## License

Source code is available under the **MIT** license.

The Authors retain all copyright to their respective work here submitted.
