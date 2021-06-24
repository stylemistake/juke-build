import * as Juke from '../src';

const DefineParameter = Juke.createParameter({
  type: 'string[]',
  name: 'define',
  alias: 'D',
});

const DmTarget = Juke.createTarget({
  name: 'dm',
  parameters: [DefineParameter],
  executes: async ({ get }) => {
    const defines = get(DefineParameter);
    for (const define of defines) {
      Juke.logger.info('Define:', define);
    }
    await Juke.sleep(1000);
    await Juke.exec('echo', ['hello!']);
  }
});

const TguiTarget = Juke.createTarget({
  name: 'tgui',
  executes: async () => {
    await Juke.sleep(750);
  },
});

const AfterTarget = Juke.createTarget({
  name: 'after',
  dependsOn: async () => [
    DmTarget,
    TguiTarget,
    true,
    false,
    null,
  ],
  executes: async () => {
    await Juke.sleep(500);
  },
});

const LogTarget = Juke.createTarget({
  name: 'log',
  executes: async () => {
    Juke.logger.error('Testing log error');
    Juke.logger.warn('Testing log warn');
    Juke.logger.info('Testing log info');
    Juke.logger.debug('Testing log debug');
  },
});

const AlwaysTarget = Juke.createTarget({
  name: 'always',
  onlyWhen: () => true,
  executes: () => undefined,
});

const NeverTarget = Juke.createTarget({
  name: 'never',
  onlyWhen: () => false,
  executes: () => undefined,
});

const SimpleFileTarget = Juke.createTarget({
  name: 'simple-file',
  inputs: [
    'non-existing-file',
    true,
    false,
  ],
  executes: () => undefined,
});

const ConditionalFileTarget = Juke.createTarget({
  name: 'conditional-file',
  inputs: async () => [
    'non-existing-file',
    true,
    false,
  ],
  executes: () => undefined,
});

const AllTarget = Juke.createTarget({
  name: 'all',
  dependsOn: [
    DmTarget,
    TguiTarget,
    AfterTarget,
    LogTarget,
    AlwaysTarget,
    NeverTarget,
    SimpleFileTarget,
    ConditionalFileTarget,
  ],
});

Juke.setup({
  default: AllTarget,
});
