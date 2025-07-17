import React, { useMemo } from 'react';
import { useField, useFieldSchema } from '@tachybase/schema';

import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { SchemaInitializerItem, SchemaInitializerSelect } from '../application';
import { useIsMobile } from '../block-provider';
import { PageStyle } from '../built-in/page-style/PageStyle.provider';
import { usePageStyle } from '../built-in/page-style/usePageStyle';
import { OpenMode, useDesignable } from '../schema-component';
import { SchemaSettingsSelectItem } from '../schema-settings';

interface Options {
  openMode?: boolean;
  openSize?: boolean;
}
export const SchemaInitializerOpenModeSchemaItems: React.FC<Options> = (options) => {
  const { openMode = true, openSize = true } = options;
  const fieldSchema = useFieldSchema();
  const field = useField();
  const { t } = useTranslation();
  const { dn } = useDesignable();
  const isMobile = useIsMobile();
  const pageStyle = usePageStyle();

  const defaultOpenMode = useMemo(() => {
    // 移动端或经典模式下默认为 PAGE 模式
    if (isMobile || pageStyle === PageStyle.TAB_STYLE) {
      return OpenMode.PAGE;
    }
    // 经典模式下默认为 DRAWER 模式
    return OpenMode.DRAWER_MODE;
  }, [isMobile, pageStyle]);

  const openModeValue = fieldSchema?.['x-component-props']?.['openMode'] || defaultOpenMode;

  return (
    <>
      {openMode ? (
        <SchemaInitializerSelect
          title={t('Open mode')}
          options={[
            { label: t('Drawer'), value: OpenMode.DRAWER_MODE },
            { label: t('Dialog'), value: OpenMode.MODAL },
          ]}
          value={openModeValue}
          onChange={(value) => {
            field.componentProps.openMode = value;
            const schema = {
              'x-uid': fieldSchema['x-uid'],
            };
            schema['x-component-props'] = fieldSchema['x-component-props'] || {};
            schema['x-component-props'].openMode = value;
            fieldSchema['x-component-props'].openMode = value;
            // when openMode change, set openSize value to default
            Reflect.deleteProperty(fieldSchema['x-component-props'], 'openSize');
            dn.emit('patch', {
              schema: schema,
            });
            dn.refresh();
          }}
        />
      ) : null}
      {openSize && [OpenMode.MODAL, OpenMode.DRAWER_MODE].includes(openModeValue) ? (
        <SchemaInitializerItem>
          <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
            {t('Popup size')}
            <Select
              data-testid="antd-select"
              bordered={false}
              options={[
                { label: t('Small'), value: 'small' },
                { label: t('Middle'), value: 'middle' },
                { label: t('Large'), value: 'large' },
              ]}
              value={
                fieldSchema?.['x-component-props']?.['openSize'] ??
                (fieldSchema?.['x-component-props']?.['openMode'] === OpenMode.MODAL ? 'large' : 'middle')
              }
              onChange={(value) => {
                field.componentProps.openSize = value;
                const schema = {
                  'x-uid': fieldSchema['x-uid'],
                };
                schema['x-component-props'] = fieldSchema['x-component-props'] || {};
                schema['x-component-props'].openSize = value;
                fieldSchema['x-component-props'].openSize = value;
                dn.emit('patch', {
                  schema: schema,
                });
                dn.refresh();
              }}
              style={{ textAlign: 'right', minWidth: 100 }}
            />
          </div>
        </SchemaInitializerItem>
      ) : null}
    </>
  );
};

export const SchemaSettingOpenModeSchemaItems: React.FC<Options> = (options) => {
  const { openMode = true, openSize = true } = options;
  const fieldSchema = useFieldSchema();
  const field = useField();
  const { t } = useTranslation();
  const { dn } = useDesignable();
  const pageStyle = usePageStyle();
  const isMobile = useIsMobile();

  const defaultOpenMode = useMemo(() => {
    if (isMobile || pageStyle === PageStyle.TAB_STYLE) {
      return OpenMode.PAGE;
    }
    return OpenMode.DRAWER_MODE;
  }, [isMobile, pageStyle]);

  const openModeValue = fieldSchema?.['x-component-props']?.['openMode'] || defaultOpenMode;

  return (
    <>
      {openMode ? (
        <SchemaSettingsSelectItem
          title={t('Open mode')}
          options={[
            { label: t('Drawer'), value: OpenMode.DRAWER_MODE },
            { label: t('Dialog'), value: OpenMode.MODAL },
            { label: t('Sheet'), value: OpenMode.SHEET },
            { label: t('Page'), value: OpenMode.PAGE },
          ]}
          value={openModeValue}
          onChange={(value) => {
            field.componentProps.openMode = value;
            const schema = {
              'x-uid': fieldSchema['x-uid'],
            };
            schema['x-component-props'] = fieldSchema['x-component-props'] || {};
            schema['x-component-props'].openMode = value;
            fieldSchema['x-component-props'].openMode = value;
            // when openMode change, set openSize value to default
            Reflect.deleteProperty(fieldSchema['x-component-props'], 'openSize');
            dn.emit('patch', {
              schema: schema,
            });
            dn.refresh();
          }}
        />
      ) : null}
      {openSize && [OpenMode.MODAL, OpenMode.DRAWER_MODE].includes(openModeValue) ? (
        <SchemaSettingsSelectItem
          title={t('Popup size')}
          options={[
            { label: t('Small'), value: 'small' },
            { label: t('Middle'), value: 'middle' },
            { label: t('Large'), value: 'large' },
          ]}
          value={
            fieldSchema?.['x-component-props']?.['openSize'] ??
            (fieldSchema?.['x-component-props']?.['openMode'] === OpenMode.MODAL ? 'large' : 'middle')
          }
          onChange={(value) => {
            field.componentProps.openSize = value;
            const schema = {
              'x-uid': fieldSchema['x-uid'],
            };
            schema['x-component-props'] = fieldSchema['x-component-props'] || {};
            schema['x-component-props'].openSize = value;
            fieldSchema['x-component-props'].openSize = value;
            dn.emit('patch', {
              schema: schema,
            });
            dn.refresh();
          }}
        />
      ) : null}
    </>
  );
};
