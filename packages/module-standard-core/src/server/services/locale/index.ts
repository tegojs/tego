import { TOKENS, type Tego } from '@tego/core';

import { Locale } from './locale';
import { getResource } from './resource';

export { Locale, getResource };

const i18next: any = require('i18next');

export const registerI18n = (tego: Tego, options: any = {}) => {
  const instance = i18next.createInstance();
  instance.init({
    lng: 'en-US',
    resources: {},
    keySeparator: false,
    nsSeparator: false,
    ...(tego.options?.i18n || options),
  });

  tego.container.set({ id: TOKENS.I18n, value: instance });
  (tego as any).i18n = instance;
  return instance;
};

export const registerLocale = (tego: Tego, options: any = {}) => {
  const localeManager = new Locale(tego);
  tego.container.set({ id: TOKENS.Locale, value: localeManager });
  (tego as any).localeManager = localeManager;

  if (Array.isArray(options?.loaders)) {
    options.loaders.forEach(([name, fn]) => localeManager.setLocaleFn(name, fn));
  }

  return localeManager;
};
