import { createContext, useContext } from 'react';

export const PageExtendComponentContext = createContext({});

export const PageExtendComponentProvider = (props) => {
  return <PageExtendComponentContext.Provider value={props}>{props.children}</PageExtendComponentContext.Provider>;
};

export const usePageExtendComponentContext = () => {
  return useContext(PageExtendComponentContext);
};
