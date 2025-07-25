import React from 'react';

import { usePageRefresh } from './PageRefreshContext';

export const WithPageRefresh = ({ children }: { children: React.ReactNode }) => {
  const { refreshKey } = usePageRefresh();

  return <React.Fragment key={refreshKey}>{children}</React.Fragment>;
};
