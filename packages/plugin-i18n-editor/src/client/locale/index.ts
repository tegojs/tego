import { useTranslation } from 'react-i18next';

export const NAMESPACE = 'i18n-editor';

export const useLocalTranslation = () => {
  return useTranslation([NAMESPACE, 'core'], { nsMode: 'fallback' });
};
