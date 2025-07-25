import { createContext, useContext } from 'react';

const ContextFormDesign = createContext<{
  visible: boolean;
  setVisible: (visible: boolean) => void;
}>({
  visible: false,
  setVisible: () => {},
});

export const ProviderContextFormDesign = ContextFormDesign.Provider;

export const useContextFormDesign = () => {
  return useContext(ContextFormDesign);
};
