import { createParameter } from '../parameter';
import { runner } from '../runner';
import { createTarget } from '../target';

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

const DefineParameter = createParameter({
  type: 'string[]',
  name: 'define',
  alias: 'D',
});

const DmTarget = createTarget(_ => _
  .name('dm')
  .parameter(DefineParameter)
  .executes(async ({ get }) => {
    const defines = get(DefineParameter);
    for (const define of defines) {
      // ...
    }
    await sleep(1000);
  })
);

const TguiTarget = createTarget(_ => _
  .name('tgui')
  .executes(async () => {
    await sleep(750);
  })
);

const AfterTarget = createTarget(_ => _
  .name('after')
  .dependsOn(DmTarget)
  .dependsOn(TguiTarget)
  .executes(async ({ get }) => {

    await sleep(500);
  })
);

const AllTarget = createTarget(_ => _
  .name('all')
  .dependsOn(DmTarget)
  .dependsOn(TguiTarget)
  .dependsOn(AfterTarget)
);

runner.register({
  parameters: [
    DefineParameter,
  ],
  default: AllTarget,
  targets: [
    DmTarget,
    TguiTarget,
    AfterTarget,
  ],
});

runner.start();
