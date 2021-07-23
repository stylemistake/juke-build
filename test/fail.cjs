const Juke = require('../dist/index.cjs');

Juke.setup({ file: __filename });

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

module.exports = {
  DmTarget,
  TguiTarget,
  AfterTarget,
  AllTarget,
  default: AllTarget,
};
