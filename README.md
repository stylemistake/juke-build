![JUKE build](./assets/juke-build.png)

> UKE-less build system with a javascript-based DSL.
> Inspired by [NUKE](https://nuke.build/).

## General usage

Copy contents of the `dist` folder anywhere you want to use Juke, then
create a javascript file for the build script with the following contents:

```ts
const { Juke } from './juke';

Juke.setup({
  parameters: [],
  targets: [],
});
```

Create targets with `createTarget`, and don't forget to include them in the
setup call.

```ts
const Target = Juke.createTarget({
  name: 'foo',
  executes: async () => {
    console.log('Hello, world!');
  },
  ...
});

Juke.setup({
  targets: [Target],
  ...
});
```

Create parameters with `createParameter`, and don't forget to include them in
the setup call. Available parameter types are: `string`, `number`, `boolean`.
Add a `[]` suffix to the type to make it an array.

```ts
const Parameter = Juke.createParameter({
  name: 'foo',
  type: 'string[]',
});

Juke.setup({
  parameters: [Parameter],
  ...
});
```

You can build targets by specifying their names via CLI.

Every flag that you specify via CLI is transformed into parameters.
Order of these flags matters!

```
./build.js [globalFlags] task-1 [flagsLocalToTask1] task-2 [flagsLocalToTask2]
```

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

## Development workflow

```
yarn install
yarn test
yarn build
```

## License

Source code is available under the **MIT** license.

The Authors retain all copyright to their respective work here submitted.
