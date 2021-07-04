# Changelog

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
