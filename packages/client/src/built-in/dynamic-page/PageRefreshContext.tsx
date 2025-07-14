import React, { createContext, ReactNode, useContext, useState } from 'react';
import { uid } from '@tachybase/schema';

interface PageRefreshContextType {
  refreshKey: string;
  refresh: () => void;
}

const PageRefreshContext = createContext<PageRefreshContextType>({
  refreshKey: uid(),
  refresh: () => {},
});

export const PageRefreshProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(uid());
  const refresh = () => setRefreshKey(uid());

  return <PageRefreshContext.Provider value={{ refreshKey, refresh }}>{children}</PageRefreshContext.Provider>;
};

export const usePageRefresh = () => useContext(PageRefreshContext);
