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
  dependsOn: [DmTarget, TguiTarget],
  executes: async () => {
    await Juke.sleep(500);
  },
});

const AllTarget = Juke.createTarget({
  name: 'all',
  dependsOn: [
    DmTarget,
    TguiTarget,
    AfterTarget,
  ],
});

Juke.setup({
  default: AllTarget,
});
