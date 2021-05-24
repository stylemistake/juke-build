/**
 * Tools for dealing with Windows Registry bullshit.
 *
 * Adapted from `tgui/packages/tgui-dev-server/winreg.js`.
 *
 * @file
 * @copyright 2020 Aleksej Komarov
 * @license MIT
 */

import { exec } from 'child_process';
import { promisify } from 'util';

export const regQuery = async (path: string | string[]) => {
  if (process.platform !== 'win32') {
    return null;
  }
  if (typeof path === 'string') {
    path = path.replace(/\\/g, '/').split('/');
  }
  if (path.length <= 1) {
    throw new Error(`Registry path can't consist of less than one element.`);
  }
  const key = path.pop();
  try {
    const command = `reg query "${path.join('\\')}" /v ${key}`;
    const { stdout } = await promisify(exec)(command);
    const keyPattern = `    ${key}    `;
    const indexOfKey = stdout.indexOf(keyPattern);
    if (indexOfKey === -1) {
      return null;
    }
    const indexOfEol = stdout.indexOf('\r\n', indexOfKey);
    if (indexOfEol === -1) {
      return null;
    }
    const indexOfValue = stdout.indexOf('    ', indexOfKey + keyPattern.length);
    if (indexOfValue === -1) {
      return null;
    }
    const value = stdout.substring(indexOfValue + 4, indexOfEol);
    return value;
  }
  catch (err) {
    return null;
  }
};
