const Juke = require('../dist');

Juke.setup({ file: __filename });

const DefineParameter = Juke.createParameter({
  type: 'string[]',
  alias: 'D',
});

const DmTarget = Juke.createTarget({
  parameters: [DefineParameter],
  executes: async ({ get, args }) => {
    const defines = get(DefineParameter);
    for (const define of defines) {
      Juke.logger.info('Define:', define);
    }
    await Juke.sleep(1000);
    const result = await Juke.exec('echo', ['hello!']);
    if (process.env.JUKE_DEBUG) {
      console.log({ result, args });
    }
  }
});

const TguiTarget = Juke.createTarget({
  executes: async () => {
    await Juke.sleep(750);
  },
});

const AfterTarget = Juke.createTarget({
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
  executes: async () => {
    Juke.logger.error('Testing log error');
    Juke.logger.warn('Testing log warn');
    Juke.logger.info('Testing log info');
    Juke.logger.debug('Testing log debug');
  },
});

const AlwaysTarget = Juke.createTarget({
  onlyWhen: () => true,
  executes: () => undefined,
});

const NeverTarget = Juke.createTarget({
  onlyWhen: () => false,
  executes: () => undefined,
});

const SimpleFileTarget = Juke.createTarget({
  inputs: [
    'non-existing-file',
    true,
    false,
  ],
  executes: () => undefined,
});

const ConditionalFileTarget = Juke.createTarget({
  inputs: async () => [
    'non-existing-file',
    true,
    false,
  ],
  executes: () => undefined,
});

const AllTarget = Juke.createTarget({
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

module.exports = {
  DefineParameter,
  DmTarget,
  TguiTarget,
  AfterTarget,
  LogTarget,
  AlwaysTarget,
  NeverTarget,
  SimpleFileTarget,
  ConditionalFileTarget,
  AllTarget,
  default: AllTarget,
};
