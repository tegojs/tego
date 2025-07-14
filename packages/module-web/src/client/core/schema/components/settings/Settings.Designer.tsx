import React from 'react';
import { GeneralSchemaDesigner, SchemaSettingsRemove, useTranslation } from '@tachybase/client';

export const SettingsDesigner = () => {
  const { t } = useTranslation();

  return (
    <GeneralSchemaDesigner>
      <SchemaSettingsRemove
        key="remove"
        removeParentsIfNoChildren
        confirm={{
          title: t('Delete settings block'),
        }}
        breakRemoveOn={{
          'x-component': 'Grid',
        }}
      />
    </GeneralSchemaDesigner>
  );
};
