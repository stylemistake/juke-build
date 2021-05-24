import { logger } from '../logger';
import { createParameter } from '../parameter';
import { runner } from '../runner';
import { createTarget } from '../target';

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

const DefineParameter = createParameter({
  type: 'string[]',
  name: 'define',
  alias: 'D',
});

const DmTarget = createTarget({
  name: 'dm',
  parameters: [DefineParameter],
  executes: async ({ get }) => {
    const defines = get(DefineParameter);
    for (const define of defines) {
      logger.info('Define:', define);
    }
    await sleep(1000);
  }
});

const TguiTarget = createTarget({
  name: 'tgui',
  executes: async () => {
    await sleep(750);
  },
});

const AfterTarget = createTarget({
  name: 'after',
  dependsOn: [DmTarget, TguiTarget],
  executes: async () => {
    await sleep(500);
  },
});

const AllTarget = createTarget({
  name: 'all',
  dependsOn: [
    DmTarget,
    TguiTarget,
    AfterTarget,
  ],
});

runner.configure({
  parameters: [
    DefineParameter,
  ],
  default: AllTarget,
  targets: [
    AllTarget,
    DmTarget,
    TguiTarget,
    AfterTarget,
  ],
});

runner.start();
