import chalk from 'chalk';

export const logger = {
  log: (...args: unknown[]) => {
    console.log(...args);
  },
  error: (...args: unknown[]) => {
    console.log(chalk.bold(
      chalk.redBright('=>'),
      chalk.whiteBright(...args)
    ));
  },
  action: (...args: unknown[]) => {
    console.log(chalk.bold(
      chalk.greenBright('=>'),
      chalk.whiteBright(...args)
    ));
  },
  warn: (...args: unknown[]) => {
    console.log(chalk.bold(
      chalk.yellowBright('=>'),
      chalk.whiteBright(...args)
    ));
  },
  info: (...args: unknown[]) => {
    console.log(chalk.bold(
      chalk.blueBright('::'),
      chalk.whiteBright(...args)
    ));
  },
  debug: (...args: unknown[]) => {
    if (process.env.JUKE_DEBUG) {
      console.log(chalk.gray(...args));
    }
  },
};
