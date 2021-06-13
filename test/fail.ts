import * as Juke from '../src';

const DmTarget = Juke.createTarget({
  name: 'dm',
  executes: async () => {
    await Juke.exec('false');
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
