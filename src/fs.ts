import fs from 'fs';
import { glob as globPkg } from 'glob';

export class File {
  private _stat?: fs.Stats | null;

  constructor(readonly path: string) {}

  get stat() {
    if (this._stat === undefined) {
      try {
        this._stat = fs.statSync(this.path);
      }
      catch {
        this._stat = null;
      }
    }
    return this._stat;
  }

  exists() {
    return this.stat !== null;
  }

  get mtime() {
    return this.stat && this.stat.mtime;
  }

  touch() {
    const time = new Date();
    try {
      fs.utimesSync(this.path, time, time);
    }
    catch (err) {
      fs.closeSync(fs.openSync(this.path, 'w'));
    }
  }
}

export class Glob {
  constructor(readonly path: string) {
    this.path = path;
  }

  toFiles() {
    const paths = globPkg.sync(this.path, {
      strict: false,
      silent: true,
    });
    return paths
      .map(path => new File(path))
      .filter(file => file.exists());
  }
}

/**
 * If true, source is newer than target.
 */
export const compareFiles = (sources: File[], targets: File[]) => {
  let bestSource = null;
  let bestTarget = null;
  for (const file of sources) {
    if (!bestSource || file.mtime! > bestSource.mtime!) {
      bestSource = file;
    }
  }
  for (const file of targets) {
    if (!file.exists()) {
      return `target '${file.path}' is missing`;
    }
    if (!bestTarget || file.mtime! < bestTarget.mtime!) {
      bestTarget = file;
    }
  }
  // Doesn't need rebuild if there is no source, but target exists.
  if (!bestSource) {
    if (bestTarget) {
      return false;
    }
    return 'no known sources or targets';
  }
  // Always needs a rebuild if no targets were specified (e.g. due to GLOB).
  if (!bestTarget) {
    return 'no targets were specified';
  }
  // Needs rebuild if source is newer than target
  if (bestSource.mtime! > bestTarget.mtime!) {
    return `source '${bestSource.path}' is newer than target '${bestTarget.path}'`;
  }
  return false;
};

/**
 * Unix style pathname pattern expansion.
 *
 * Perform a search matching a specified pattern according to the rules of
 * the `glob` npm package. Path can be either absolute or relative, and can
 * contain shell-style wildcards. Broken symlinks are included in the results
 * (as in the shell). Whether or not the results are sorted depends on the
 * file system.
 *
 * @returns A possibly empty list of file paths.
 */
export const glob = (globPath: string) => {
  const unsafePaths = globPkg.sync(globPath, {
    strict: false,
    silent: true,
  });
  const safePaths = [];
  for (let path of unsafePaths) {
    try {
      fs.lstatSync(path);
      safePaths.push(path);
    }
    catch {}
  }
  return safePaths;
};

type RmOptions = {
  /**
   * If true, perform a recursive directory removal.
   */
  recursive?: boolean;
  /**
   * If true, exceptions will be ignored if file or directory does not exist.
   */
  force?: boolean;
}

/**
 * Removes files and directories (synchronously). Supports globs.
 */
export const rm = (path: string, options: RmOptions = {}) => {
  for (const p of glob(path)) {
    try {
      if (options.recursive && fs.rmSync) {
        fs.rmSync(p, options);
      }
      else if (options.recursive) {
        fs.rmdirSync(p, { recursive: true });
      }
      else {
        fs.unlinkSync(p);
      }
    }
    catch (err) {
      if (!options.force) {
        throw err;
      }
    }
  }
};
