![JUKE build](https://github.com/stylemistake/juke-build/blob/master/assets/juke-build.png)

> The AKE-less General Purpose Build System with JavaScript DSL for Node.js platform.
> Inspired by [NUKE](https://nuke.build/).

This project is reaching a mature stage, although a lot of features are still in development. Take a look at our [roadmap](https://github.com/stylemistake/juke-build/projects/1).

## Project goals

### Simplicity

Everything should be as simple as possible in all technical aspects. Builds are written in pure JavaScript and provide only the bare minimum for getting the job done. TypeScript is supported, but not required.

Currently it packs the following:

- A robust dependency model between targets
- File timestamp checker for inputs/outputs
- Built-in CLI argument (and environment) parser with a strongly typed Parameter API.
- Asynchronous execution of external programs via `Juke.exec()`

You can bring your own tools into the mix, e.g. the glorious [google/zx](https://github.com/google/zx), or native JavaScript tooling, e.g. [webpack](https://webpack.js.org/), with no restrictions imposed by our build framework.

### Minimal dependencies

Build system should be native to JavaScript and Node.js, and require nothing but the Node.js executable, i.e. no dependency on npm/yarn or TypeScript compiler.

### Strongly typed

Strongly typed API with fully instrospectible build scripts that are written in plain JavaScript, which allows us to parse the build script and generate definition files for tighter integration with other tooling (e.g. CI).

## How to build

```
./build.mjs
```

## General usage

Copy contents of the `dist` folder anywhere you want to use Juke (and rename it to `juke`), then create a javascript file for the build script with the following contents (pick one):

**ES modules variant (recommended):**

```ts
// build.mjs
import Juke from './juke/index.cjs';

Juke.setup({ file: import.meta.url });

// TODO: Declare targets here
export const MyTarget = Juke.createTarget({
  // ...
});
```

**CommonJS modules variant:**

```ts
// build.cjs
const Juke = require('./juke');

Juke.setup({ file: __filename });

// TODO: Declare targets here
const MyTarget = Juke.createTarget({
  // ...
});

// TODO: Export targets here
module.exports = {
  MyTarget,
};
```

We recommend using an ES module for the build script, because it allows exporting targets/parameters with a much shorter syntax.

### Create targets

Target is a simple container for your build script that defines how it should be executed in relation to other targets. It may have dependencies on other targets, and may have various other conditions for executing the target.

```ts
export const Target = Juke.createTarget({
  executes: async () => {
    console.log('Hello, world!');
  },
});
```

> Notice: When referencing an unexported target, it must have a `name` property, which is used in CLI for specifying (and displaying) the target. If you forget to specify a `name`, it will be displayed as `undefined` during execution.
>
> ```ts
> const Target = Juke.createTarget({
>   name: 'foo',
>   // ...
> });
> ```
>
> Normally, name is derived from the name of the exported variable (minus the `Target` suffix).

### Declare dependencies

```ts
export const Target = Juke.createTarget({
  dependsOn: [OtherTarget],
  // ...
});
```

### Set a default target

When no target is provided via CLI, Juke will execute the default target.

```ts
export const Target = Juke.createTarget({
  // ...
});

export default Target;
```

### Declare file inputs and outputs

If your target consumes and creates files, you can declare them on the target, so it would check whether it actually needs to rebuild.

If any input file is newer than the output file, target will be rebuilt, and skipped otherwise.

Supports globs.

```ts
export const Target = Juke.createTarget({
  inputs: ['package.json', 'src/**/*.js'],
  outputs: ['dest/bundle.js'],
  // ...
});
```

### Create parameters

Available parameter types are: `string`, `number` and `boolean`. You may add a `[]` suffix to the type to make it an array.

To provide a parameter via CLI, you can either specify it by name (e.g. `--name`), or its alias (e.g. `-N`). If parameter is not a `boolean` type, value will be expected, which you can provide via `--name=value` or `-Nvalue`.

To fetch the parameter's value, you can use the `get` helper, which is exposed on the target's context.

```ts
export const FileParameter = Juke.createParameter({
  type: 'string[]',
  alias: 'f',
});

export const Target = Juke.createTarget({
  executes: async ({ get }) => {
    const files = get(FileParameter);
    console.log('Parameter values:', files);
  },
  // ...
});
```

You can also dynamically set up target dependencies using binary expressions:

```ts
export const Target = Juke.createTarget({
  dependsOn: ({ get }) => [
    get(FileParameter).includes('foo') && FooTarget,
  ],
  // ...
});
```

If you simply need access to arguments passed to the target, you can use the `args` context variable. Note, that you can only pass arguments that begin with `-` or `--`, because all other arguments are normally treated as targets to build.

```ts
export const Target = Juke.createTarget({
  executes: async ({ args }) => {
    console.log('Passed arguments:', args);
  },
});
```

Context is available on these properties (when using a function syntax):

- `dependsOn`
- `inputs`
- `outputs`
- `onlyWhen`
- `executes`

> Notice: When referencing an unexported parameter, it must have a `name`, which is used in CLI for specifying the parameter.
>
> ```ts
> const FileParameter = Juke.createParameter({
>   name: 'file',
> });
> ```
>
> Normally, name is derived from the name of the exported variable (minus the `Parameter` suffix, if it exists).


### Conditionally run targets

If you need more control over when the target builds, you can provide a custom condition using `onlyWhen`. Target will build only when the condition is `true`.

Function can be `async` if it has to be, target will wait for all promises to resolve.

```ts
export const Target = Juke.createTarget({
  onlyWhen: ({ get }) => get(BuildModeParameter) === BUILD_ALL,
  // ...
});
```

### Execute an external program

Juke provides a handy `Juke.exec` helper.

```ts
export const Target = Juke.createTarget({
  executes: async () => {
    await Juke.exec('yarn', ['install']);
  },
});
```

On program completion, you get its stdout and stderr. In case, when you need to run a program just to parse its output, you can set a `silent` option to stop it from piping its output to `stdio`.

```ts
const { stdout, stderr, combined } = await Juke.exec(command, ...args, {
  silent: true,
});
```

It throws by default if program has exited with a non-zero exit code (or was killed by a non-EXIT signal). If uncatched, error propagates through Juke and puts dependent targets into a failed state.

You can disable this behavior via:

```ts
const { code } = Juke.exec(command, ...args, {
  throw: false,
});
```

You can also simulate an exit code by rethrowing it yourself.

```ts
throw new Juke.ExitCode(1);
```

### Run the build

You can build targets by specifying their names via CLI.

Every flag that you specify via CLI is transformed into parameters, and their names are canonically written in `--kebab-case`.

```
./build.js [globalFlags] task-1 [flagsLocalToTask1] task-2 [flagsLocalToTask2]
```

To specify an array of parameters, you can simply specify the same flag multiple times:

```
./build.js task-1 --foo=A --foo=B
```

You can also specify parameters via the environment. Environment variable names must be written in `CONSTANT_CASE`. If this parameter is an array, you can use a comma to separate the values.

```
FOO=A,B ./build.js task-1
```

## Examples

[Our own build pipeline](https://github.com/stylemistake/juke-build/blob/master/build.mjs)

[/tg/station13 build pipeline](https://github.com/tgstation/tgstation/blob/master/tools/build/build.js)

<details>
  <summary>Screenshot</summary>
  <img alt="image" src="https://user-images.githubusercontent.com/1516236/123164088-26166580-d47b-11eb-9b03-b048274a4499.png">
</details>

## License

Source code is available under the **MIT** license.

The Authors retain all copyright to their respective work here submitted.
