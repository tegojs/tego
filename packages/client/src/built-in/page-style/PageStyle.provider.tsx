import React, { createContext, useEffect, useState } from 'react';

import { TabsProps } from 'antd';

import { useCurrentUserContext, useCurrentUserSettingsMenu } from '../../user';
import { useTabSettings } from './useTabSettings';

export enum PageStyle {
  CLASSICAL = 'classical',
  TAB_STYLE = 'tab-style',
}

interface PageStyleContextValue {
  pageStyle: PageStyle;
  items: TabsProps['items'];
  setItems: React.Dispatch<React.SetStateAction<TabsProps['items']>>;
}

export const PageStyleContext = createContext<Partial<PageStyleContextValue>>({
  pageStyle: PageStyle.CLASSICAL,
});

export const PageStyleProvider = ({ children }) => {
  const currentUser = useCurrentUserContext();
  const tabItem = useTabSettings();
  const [items, setItems] = useState<TabsProps['items']>([]);
  const { addMenuItem } = useCurrentUserSettingsMenu();
  useEffect(() => {
    addMenuItem(tabItem, { before: 'divider_3' });
  }, [addMenuItem, tabItem]);

  return (
    <PageStyleContext.Provider
      value={{
        pageStyle: currentUser?.data?.data?.systemSettings?.pageStyle || PageStyle.CLASSICAL,
        items,
        setItems,
      }}
    >
      {children}
    </PageStyleContext.Provider>
  );
};
