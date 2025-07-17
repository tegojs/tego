import React, { createContext } from 'react';
import { Schema } from '@tachybase/schema';

import { DrawerProps, ModalProps } from 'antd';

import { useActionContext } from './hooks';

export const ActionContext = createContext<ActionContextProps>({});
ActionContext.displayName = 'ActionContext';

export const ActionContextProvider = (props: ActionContextProps & { value?: ActionContextProps; children: any }) => {
  const contextProps = useActionContext();
  return (
    <ActionContext.Provider value={{ ...contextProps, ...props, ...props?.value }}>
      {props.children}
    </ActionContext.Provider>
  );
};

export type OpenSize = 'small' | 'middle' | 'large';

export enum OpenMode {
  // 默认模式DEFAULT，在经典模式默认行为为 PAGE,在多标签页状态默认行为为PAGE，在手机状态默认行为为 PAGE
  DEFAULT = 'default',
  // 旧版抽屉模式DRAWER，表现行为同 DEFAULT,是为了兼容旧版,旧版没有 DEFAULT 概念.
  DRAWER = 'drawer',
  // 模态模式MODAL
  MODAL = 'modal',
  // 页面模式PAGE
  PAGE = 'page',
  // 弹窗模式SHEET
  SHEET = 'sheet',
  // 新版抽屉模式DRAWER_MODE, 新版 DRAWER
  DRAWER_MODE = 'drawer-mode',
}

export interface ActionContextProps {
  button?: any;
  visible?: boolean;
  setVisible?: (v: boolean) => void;
  openMode?: OpenMode;
  snapshot?: boolean;
  openSize?: OpenSize;
  containerRefKey?: string;
  formValueChanged?: boolean;
  setFormValueChanged?: (v: boolean) => void;
  fieldSchema?: Schema;
  drawerProps?: DrawerProps;
  modalProps?: ModalProps;
}
