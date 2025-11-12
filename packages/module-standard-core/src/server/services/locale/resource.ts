import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';
import { requireModule } from '@tachybase/utils';

const arr2obj = (items: any[]) => {
  const obj = {};
  for (const item of items) {
    Object.assign(obj, item);
  }
  return obj;
};

export const getResource = (packageName: string, lang: string, isPlugin = true) => {
  const resources = [];
  const prefixes = [isPlugin ? 'dist' : 'lib'];
  if (process.env.APP_ENV !== 'production') {
    try {
      require.resolve('@tachybase/client/src');
      if (packageName === '@tachybase/module-web') {
        packageName = '@tachybase/client';
      }
    } catch (error) {
      // empty
    }
    prefixes.unshift('src');
  }
  for (const prefix of prefixes) {
    try {
      let file = `${packageName}/${prefix}/locale/${lang}`;
      const resource = requireModule(file);
      resources.push(resource);
    } catch (error) {
      // empty
    }
    if (resources.length) {
      break;
    }
  }
  if (resources.length === 0 && lang.replace('-', '_') !== lang) {
    return getResource(packageName, lang.replace('-', '_'));
  }
  return arr2obj(resources);
};
