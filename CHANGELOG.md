# Changelog

## [Unreleased]

## [0.8.0] - 2021-08-11

### Added

- `new Juke.Target()` and `new Juke.Parameter()` constructors, which work the same way as `Juke.createTarget()` and `Juke.createParameter()` respectively. Constructors are more direct than creator functions, so using them is preferred.
- `Juke.chdir()` was added as an easy way to change directories relative to `import.meta.url`.
- `Juke.glob()` is now generally available for unix-style pathname pattern expansion.
- `Juke.rm()` was added as a common file removal tool. It has a subset of Node 16 API but is compatible with Node 12, and has an built-in support for globs.
- `Juke.setup()` accepts a `singleTarget` mode setting, which reconfigures CLI to only accept one target and treat all the remaining arguments (not only flags) as this target's arguments.

### Changed

- Compiled bundle was changed back to `index.js` from `index.cjs`, because the latter was not compatible with the default Node.js resolver and TypeScript could not import type definitions properly.

## [0.7.0] - 2021-07-23

### Added

- Added `args` to execution context, which basically passes through all the flags following the target.

### Changed

- Juke.setup now returns a promise with exit code, same as before

## [0.6.3] - 2021-07-23

### Fixed

- Replaced `??` syntax with a more compatible one for Node 12.

## [0.6.2] - 2021-07-23

> Re-released due to issues with packaging. Updated local juke build binary and removed unnecessary console logs.

## [0.6.0] - 2021-07-23

### BREAKING CHANGE

Juke Build now supports ES modules as build scripts, which was a good opportunity to redesign the whole thing to support named exports. When target/parameter is exported, you may omit the `name` property completely, and it will be automatically picked up from the name of the exported variable.

Targets are no longer automatically registered, and you must export them via `export` keyword in ES modules, or `module.exports` in CommonJS.

You must now call `Juke.setup()` to point the executor to the build script that you want to parse/run:

```ts
// ES modules variant
Juke.setup({ file: import.meta.url });
// CommonJS variant
Juke.setup({ file: __filename });
```

## [0.5.1] - 2021-07-04

> Re-released due to issues with packaging.

## [0.5.0] - 2021-07-04

### Added

- `Juke.exec` now returns useful data on completion, like `code`, `stdout`, `stderr` and `combined` (which is `stdout` + `stderr`).
- `Juke.exec` accepts two new options as the last argument:
  - `silent` - If `true`, disables piping of its output to `stdout` and `stderr`.
  - `throw` - If `false`, it won't throw an exception on a non-zero exit code. Useful if you want to analyze the exit code via it's `code` variable it returns.
- `Juke.ExitCode` constructor is exposed in case if you want to throw a custom exit code in the `executes` function and fail the target.
  - It is thrown like this: `throw new Juke.ExitCode(1)`

### Changed

With the help of [dts-bundle-generator](https://github.com/timocov/dts-bundle-generator),
Juke build is now only two files:
- `dist/index.js`
- `dist/index.d.ts`

## [0.4.0] - 2021-06-24

### Added

- `dependsOn`, `inputs`, `outputs`, and `onlyWhen` fields now all accept
functions with execution context, and all of them can be async.
- Async `dependsOn` will block initialization of the task runner due to the
way dependency resolution is currently implemented. Prefer sync functions over
async, otherwise use carefully.

### Removed

- Removed the ability to pass arrays of functions to `executes` and
`onlyWhen`, because nobody will realistically use it, and it increases
Juke's code complexity.

## [0.3.1] - 2021-06-24

### Fixed

- Await `onlyWhen` conditions, which can possibly be async.

## [0.3.0] - 2021-06-24

### Added

- Added `onlyWhen` property to targets for specifying build conditions.

## [0.2.4] and below

[Refer to commit history](https://github.com/stylemistake/juke-build/commits/master).
