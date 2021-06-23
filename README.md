![JUKE build](https://github.com/stylemistake/juke-build/blob/master/assets/juke-build.png)

> The AKE-less Build System for JavaScript and Node.js.
> Inspired by [NUKE](https://nuke.build/).

This project is a work in progress, take a look at our
[roadmap](https://github.com/stylemistake/juke-build/projects/1).

## Project goals

### Simplicity

Everything should be as simple as possible in all technical aspects. Builds
are written in pure JavaScript and provide only the bare minimum for getting
the job done.

Currently it packs the following:

- A robust dependency model between targets
- File timestamp checker for inputs/outputs
- Built-in CLI argument (and environment) parser with a strongly typed
Parameter API.
- Asynchronous execution of external programs via `Juke.exec()`

You can bring your own tools into the mix, e.g. the glorious
[google/zx](https://github.com/google/zx), or native JavaScript tooling, e.g.
[webpack](https://webpack.js.org/), with no restrictions imposed by our build
framework.

### Minimal dependencies

Build system should be native to JavaScript and Node.js, and require nothing
but the Node.js executable, i.e. no dependency on npm or TypeScript compiler.

### Strongly typed

Strongly typed API with fully instrospectible build scripts that are written
in plain JavaScript, which allows us to parse the build script and generate
definition files for tighter integration with other tooling (e.g. CI).

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
});
```

### Declare dependencies

```ts
const Target = Juke.createTarget({
  dependsOn: [OtherTarget],
  // ...
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

To provide a parameter via CLI, you can either specify it by name
(i.e. `--name`), or its alias (i.e. `-N`). If parameter is not `boolean`,
a value is expected, which you can provide via `--name=value` or `-Nvalue`.

To fetch the parameter's value, you must use a `get` helper, which is a
property of an execution context - object that is passed to almost every
target's function in Juke.

```ts
const Parameter = Juke.createParameter({
  name: 'name',
  type: 'string[]',
  alias: 'N',
});

const Target = Juke.createTarget({
  name: 'foo',
  parameters: [Parameter],
  executes: async ({ get }) => {
    const values = get(Parameter);
    console.log('Parameter values:', values);
  },
  // ...
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
  // ...
});
```

### Conditionally run targets

If you need more control over when the target builds, you can provide a custom
condition using `onlyWhen`. Target will build only when the condition is
`true`.

Function can be `async` if it has to be, target will wait for all promises to
resolve.

If you have a bunch of reusable conditions, you can pass an array of
conditions.

```ts
const Target = Juke.createTarget({
  onlyWhen: ({ get }) => get(BuildModeParameter) === BUILD_ALL,
  // ...
});
```

### Execute an external program

```ts
const Target = Juke.createTarget({
  name: 'foo',
  executes: async () => {
    await Juke.exec('yarn', ['install'])
  },
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

## Examples

[/tg/station13 build pipeline](https://github.com/tgstation/tgstation/blob/d200efc29312a2683a9d074e999db70287f69eae/tools/build/build.js)

<details>
  <summary>Screenshot</summary>
  <img alt="image" src="https://user-images.githubusercontent.com/1516236/123164088-26166580-d47b-11eb-9b03-b048274a4499.png">
</details>

## License

Source code is available under the **MIT** license.

The Authors retain all copyright to their respective work here submitted.
