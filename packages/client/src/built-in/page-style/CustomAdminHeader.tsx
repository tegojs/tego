import React from 'react';

import { TabHeader } from './TabHeader';
import { usePageStyle } from './usePageStyle';

export const CustomAdminHeader = () => {
  const pageStyle = usePageStyle();

  return pageStyle === 'tab' ? <TabHeader /> : null;
};
