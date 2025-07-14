import React, { useEffect, useMemo, useState } from 'react';
import {
  cx,
  PageExtendComponentProvider,
  SchemaComponent,
  SortableItem,
  useCompile,
  useDesigner,
  useDocumentTitle,
  useToken,
  useTranslation,
} from '@tachybase/client';
import { useField, useFieldSchema } from '@tachybase/schema';

import { ShareAltOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { NavBar, NavBarProps } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';

import { generateNTemplate } from '../../../../locale';
import { HeaderDesigner } from './Header.Designer';
import { useStyles } from './style';

export interface HeaderProps extends NavBarProps {
  title?: string;
  showBack?: boolean;
}
const InternalHeader = (props: HeaderProps) => {
  const field = useField();
  const { title = generateNTemplate('Untitled'), showBack = false } = { ...props, ...field?.componentProps };
  const Designer = useDesigner();
  const compile = useCompile();
  const compiledTitle = compile(title);
  const navigate = useNavigate();
  const { setTitle } = useDocumentTitle();
  const { token } = useToken();
  const { styles } = useStyles();
  const fieldSchema = useFieldSchema();
  const parentFieldSchema = fieldSchema.parent;
  const extendComponents = parentFieldSchema['x-extend-components'];
  const enabledSharePage = parentFieldSchema['x-component-props']?.['enableSharePage'];
  useEffect(() => {
    // sync title
    setTitle(compiledTitle);
  }, [compiledTitle]);

  const style = useMemo(() => {
    return {
      width: '100%',
      background: token.colorBgContainer,
    };
  }, [token.colorBgContainer]);

  return (
    <SortableItem className={cx('tb-mobile-header')} style={style}>
      <NavBar backArrow={showBack} onBack={() => navigate(-1)} className={styles.mobileNav}>
        <div>{compiledTitle}</div>
        <>
          {Object.values(extendComponents)?.map((item: any) => {
            const schema = {
              type: 'void',
              name: item.name,
              'x-component': item.component,
              'x-comonent-props': {},
            };
            const componentProps = {
              ...props,
              isHeaderEnabled: true,
              fieldSchema: parentFieldSchema,
              title,
              enabledSharePage,
            };
            return (
              <PageExtendComponentProvider {...componentProps}>
                <SchemaComponent schema={schema} />
              </PageExtendComponentProvider>
            );
          })}
        </>
      </NavBar>
      <Designer />
    </SortableItem>
  );
};

export const MHeader = InternalHeader as unknown as typeof InternalHeader & {
  Designer: typeof HeaderDesigner;
};

MHeader.Designer = HeaderDesigner;
