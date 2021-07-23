import chalk from 'chalk';
import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { resolve as resolvePath } from 'path';
import { stat } from './fs';

const children = new Set<ChildProcess>();

const killChildren = () => {
  for (const child of children) {
    child.kill('SIGTERM');
    children.delete(child);
    console.log('killed child process');
  }
};

type SignalHandler = (signal: string) => void;

const trap = (signals: string[], handler: SignalHandler) => {
  let readline;
  if (process.platform === 'win32') {
    readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  for (const signal of signals) {
    const handleSignal = () => handler(signal);
    if (signal === 'EXIT') {
      process.on('exit', handleSignal);
      continue;
    }
    if (readline) {
      readline.on('SIG' + signal, handleSignal);
    }
    process.on('SIG' + signal, handleSignal);
  }
};

trap(['EXIT', 'BREAK', 'HUP', 'INT', 'TERM'], (signal) => {
  if (signal !== 'EXIT') {
    console.log('Received', signal);
  }
  killChildren();
  if (signal !== 'EXIT') {
    process.exit(1);
  }
});

const exceptionHandler = (err: unknown) => {
  console.log(err);
  killChildren();
  process.exit(1);
};

process.on('unhandledRejection', exceptionHandler);
process.on('uncaughtException', exceptionHandler);

export class ExitCode extends Error {
  code: number | null = null;
  signal: string | null = null;

  constructor(code: number | null, signal?: string | null) {
    super('Process exited with code: ' + code);
    this.code = code;
    this.signal = signal || null;
  }
}

export type ExecOptions = SpawnOptionsWithoutStdio & {
  /**
   * If `true`, this exec call will not pipe its output to stdio.
   * @default false
   */
  silent?: boolean;
  /**
   * Throw an exception on non-zero exit code.
   * @default true
   */
  throw?: boolean;
};

export type ExecReturn = {
  /** Exit code of the program. */
  code: number | null;
  /** Signal received by the program which caused it to exit. */
  signal: NodeJS.Signals | null;
  /** Output collected from `stdout` */
  stdout: string;
  /** Output collected from `stderr` */
  stderr: string;
  /** A combined output collected from `stdout` and `stderr`. */
  combined: string;
};

export const exec = (
  executable: string,
  args: string[] = [],
  options: ExecOptions = {},
) => {
  const {
    silent = false,
    throw: canThrow = true,
    ...spawnOptions
  } = options;
  return new Promise<ExecReturn>((resolve, reject) => {
    // If executable exists relative to the current directory,
    // use that executable, otherwise spawn should fall back to
    // running it from PATH.
    if (stat(executable)) {
      executable = resolvePath(executable);
    }
    if (process.env.JUKE_DEBUG) {
      console.log(chalk.grey('$', executable, ...args));
    }
    const child = spawn(executable, args, spawnOptions);
    children.add(child);
    let stdout = '';
    let stderr = '';
    let combined = '';
    child.stdout.on('data', (data) => {
      if (!silent) {
        process.stdout.write(data);
      }
      stdout += data;
      combined += data;
    });
    child.stderr.on('data', (data) => {
      if (!silent) {
        process.stderr.write(data);
      }
      stderr += data;
      combined += data;
    });
    child.on('error', (err) => reject(err));
    child.on('exit', (code, signal) => {
      children.delete(child);
      if (code !== 0 && canThrow) {
        const error = new ExitCode(code);
        error.code = code;
        error.signal = signal;
        reject(error);
        return;
      }
      resolve({
        code,
        signal,
        stdout,
        stderr,
        combined,
      });
    });
  });
};
