import React from 'react';

import * as antIcons from '@ant-design/icons';
import AntdIcon, { createFromIconfontCN } from '@ant-design/icons';

import * as preloaded from './preloaded';
import * as customIcons from './svgIcon';

let IconFont: any;

export const icons = new Map<string, any>();

export function registerIcon(type: string, icon: any = IconFont) {
  icons.set(type.toLowerCase(), icon);
}

export function hasIcon(type: string) {
  if (!type) {
    return false;
  }
  return icons.has(type.toLowerCase());
}

export function registerIcons(components) {
  Object.keys(components).forEach((type) => {
    registerIcon(type, components[type]);
  });
}

Object.keys(antIcons).forEach((name) => {
  if (name.endsWith('Outlined')) {
    registerIcon(name, antIcons[name]);
  }
});

interface IconProps {
  type?: string;
  component?: any;
  [key: string]: any;
}

export const Icon = (props: IconProps): React.ReactNode => {
  const { type = '', component, ...restProps } = props;
  if (component) {
    return <AntdIcon component={component} {...restProps} />;
  }
  if (type && icons.has(type.toLowerCase())) {
    const IconComponent = icons.get(type.toLowerCase());
    return <IconComponent {...restProps} />;
  }
  if (type && IconFont) {
    return <IconFont type={type} {...restProps} />;
  }
  return null;
};

Icon.createFromIconfontCN = (options) => {
  IconFont = createFromIconfontCN(options);
};

Icon.register = (icons?: any) => {
  registerIcons(icons);
};

for (const name in preloaded) {
  const PreloadedIcon = (props) => <Icon component={preloaded[name]} {...props} />;
  Icon.register({ [name]: PreloadedIcon });
}

for (const name in customIcons) {
  const customIconsIcon = (props) => <Icon component={customIcons[name]} {...props} />;
  Icon.register({ [name]: customIconsIcon });
}

export default Icon;
