import React from 'react';
import { SchemaSettingsDropdown, SchemaSettingsRemove, useDesignable, useTranslation } from '@tachybase/client';
import { useField, useFieldSchema } from '@tachybase/schema';

import { MenuOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export const MenuDesigner: React.FC = (props) => {
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const { dn } = useDesignable();
  const field = useField();
  const schemaSettingsProps = {
    dn,
    field,
    fieldSchema,
  };
  return (
    <SchemaSettingsDropdown
      title={
        <Button
          style={{
            borderColor: 'var(--colorSettings)',
            color: 'var(--colorSettings)',
          }}
          icon={<MenuOutlined />}
          type="dashed"
        >
          {t('Menu configuration')}
        </Button>
      }
      {...schemaSettingsProps}
    >
      <SchemaSettingsRemove
        key="remove"
        removeParentsIfNoChildren
        confirm={{
          title: t('Delete menu block'),
        }}
        breakRemoveOn={{
          'x-component': 'Grid',
        }}
      />
    </SchemaSettingsDropdown>
  );
};
