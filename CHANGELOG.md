# Changelog

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
