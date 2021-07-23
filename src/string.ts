import { camelcase, constcase, spinalcase } from 'stringcase';

export const toKebabCase = (str: string) => spinalcase(str);
export const toCamelCase = (str: string) => camelcase(str);
export const toConstCase = (str: string) => constcase(str);
