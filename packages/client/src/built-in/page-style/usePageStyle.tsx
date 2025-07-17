import { useContext } from 'react';

import { PageStyleContext } from './PageStyle.provider';

export const usePageStyle = () => {
  return useContext(PageStyleContext).style;
};
