import React, { useMemo } from 'react';
import {
  Action,
  actionSettingsItems,
  SchemaSettings,
  SchemaSettingsActionModalItem,
  useCollection_deprecated,
  useDesignable,
  useRequest,
} from '@tachybase/client';
import { ArrayItems } from '@tachybase/components';
import { useFieldSchema } from '@tachybase/schema';

import { App } from 'antd';

import { listByCurrentRoleUrl } from '../constants';
import {
  useCustomRequestFields,
  useCustomRequestVariableOptions,
  useCustomRequestVariableRecordOptions,
  useGetCustomRequest,
} from '../hooks';
import { useCustomRequestsResource } from '../hooks/useCustomRequestsResource';
import { useResultValuesVisible } from '../hooks/useResultValuesVisible';
import { useTranslation } from '../locale';
import { CustomRequestACLSchema, CustomRequestConfigurationFieldsSchema } from '../schemas';

export function CustomRequestSettingsItem() {
  const { t } = useTranslation();
  const { name } = useCollection_deprecated();
  const fieldSchema = useFieldSchema();
  const customRequestsResource = useCustomRequestsResource();
  const { data, refresh } = useGetCustomRequest();
  const { dn } = useDesignable();
  const initialValues = useMemo(() => {
    const values = { ...data?.data?.options };
    if (values.data && typeof values.data !== 'string') {
      values.data = JSON.stringify(values.data, null, 2);
    }
    return values;
  }, [data?.data?.options]);

  return (
    <>
      <SchemaSettingsActionModalItem
        title={t('Request settings')}
        components={{
          ArrayItems,
        }}
        beforeOpen={() => !data && refresh()}
        scope={{
          useCustomRequestVariableOptions,
          useCustomRequestFields,
          useCustomRequestVariableRecordOptions,
          useResultValuesVisible,
        }}
        schema={CustomRequestConfigurationFieldsSchema}
        initialValues={initialValues}
        onSubmit={async (config) => {
          const { ...requestSettings } = config;
          await customRequestsResource.updateOrCreate({
            values: {
              key: fieldSchema['x-uid'],
              options: {
                ...requestSettings,
                collectionName: name,
              },
            },
            filterKeys: ['key'],
          });
          fieldSchema['x-request-setting'] = { ...config };
          dn.emit('patch', {
            schema: {
              'x-uid': fieldSchema['x-uid'],
              'x-request-setting': fieldSchema['x-request-setting'],
            },
          });
          dn.refresh();
          refresh();
        }}
      />
    </>
  );
}

export function CustomRequestACL() {
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const customRequestsResource = useCustomRequestsResource();
  const { message } = App.useApp();
  const { data, refresh } = useGetCustomRequest();
  const { refresh: refreshRoleCustomKeys } = useRequest<{ data: string[] }>(
    {
      url: listByCurrentRoleUrl,
    },
    {
      manual: true,
      cacheKey: listByCurrentRoleUrl,
    },
  );

  return (
    <>
      <SchemaSettingsActionModalItem
        title={t('Access control')}
        schema={CustomRequestACLSchema}
        initialValues={{
          roles: data?.data?.roles,
        }}
        beforeOpen={() => !data && refresh()}
        onSubmit={async ({ roles }) => {
          await customRequestsResource.updateOrCreate({
            values: {
              key: fieldSchema['x-uid'],
              roles,
            },
            filterKeys: ['key'],
          });
          refresh();
          refreshRoleCustomKeys();
          return message.success(t('Saved successfully'));
        }}
      />
    </>
  );
}

/**
 * @deprecated
 */
export const customRequestActionSettings = new SchemaSettings({
  name: 'CustomRequestActionSettings',
  items: [
    {
      ...actionSettingsItems[0],
      children: [
        ...actionSettingsItems[0].children,
        {
          name: 'request settings',
          Component: CustomRequestSettingsItem,
        },
        {
          name: 'accessControl',
          Component: CustomRequestACL,
        },
      ],
    },
  ],
});

/**
 * @deprecated
 */
export const CustomRequestActionDesigner: React.FC = () => {
  const customRequestsResource = useCustomRequestsResource();
  const fieldSchema = useFieldSchema();
  return (
    <Action.Designer
      linkageAction
      schemaSettings="CustomRequestActionSettings"
      buttonEditorProps={{
        isLink: fieldSchema['x-action'] === 'customize:table:request',
      }}
      linkageRulesProps={{
        type: 'button',
      }}
      removeButtonProps={{
        onConfirmOk() {
          return customRequestsResource.destroy({
            filterByTk: fieldSchema['x-uid'],
          });
        },
      }}
    ></Action.Designer>
  );
};
