import fs from 'fs';
import path from 'path';
import url from 'url';

/**
 * Change the current working directory of the Node.js process.
 *
 * Second argument is a file (or directory), relative to which chdir will be
 * performed. This is usually `import.meta.url`.
 */
export const chdir = (directory: string, relativeTo?: string) => {
  if (relativeTo) {
    relativeTo = url.fileURLToPath(relativeTo);
    try {
      const stat = fs.statSync(relativeTo);
      if (!stat.isDirectory()) {
        relativeTo = path.dirname(relativeTo);
      }
    }
    catch {
      relativeTo = path.dirname(relativeTo);
    }
    directory = path.resolve(relativeTo, directory);
  }
  process.chdir(directory);
};
