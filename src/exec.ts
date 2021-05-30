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

export class ExitError extends Error {
  code: number | null = null;
  signal: string | null = null;
}

export const exec = (
  executable: string,
  args: string[] = [],
  options: SpawnOptionsWithoutStdio = {},
) => {
  return new Promise<void>((resolve, reject) => {
    // If executable exists relative to the current directory,
    // use that executable, otherwise spawn should fall back to
    // running it from PATH.
    if (stat(executable)) {
      executable = resolvePath(executable);
    }
    const child = spawn(executable, args, options);
    children.add(child);
    child.stdout.pipe(process.stdout, { end: false });
    child.stderr.pipe(process.stderr, { end: false });
    child.stdin.end();
    child.on('error', (err) => reject(err));
    child.on('exit', (code, signal) => {
      children.delete(child);
      if (code !== 0) {
        const error = new ExitError('Process exited with code: ' + code);
        error.code = code;
        error.signal = signal;
        reject(error);
      }
      else {
        resolve();
      }
    });
  });
};
