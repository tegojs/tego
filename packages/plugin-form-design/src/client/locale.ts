import { i18n, tval as nTval } from '@tachybase/client';

import { useTranslation as useT } from 'react-i18next';

import { NAMESPACE } from './constants';

export function useTranslation() {
  return useT(NAMESPACE);
}
export function lang(key: string, options = {}) {
  return i18n.t(key, {
    ...options,
    ns: NAMESPACE,
  });
}

export const tval = (
  key: string,
  options = {
    ns: NAMESPACE,
  },
) => nTval(key, options);
