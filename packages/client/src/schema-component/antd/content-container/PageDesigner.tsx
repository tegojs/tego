import { useFieldSchema } from '@tachybase/schema';

import { Space } from 'antd';

import { useDesignable } from '../..';
import { useSchemaSettingsRender } from '../../../application/schema-settings/hooks';
import { SchemaToolbarProvider } from '../../../application/schema-toolbar/context';

export const PageDesigner = ({ title }) => {
  const { designable } = useDesignable();
  const fieldSchema = useFieldSchema();
  const { render } = useSchemaSettingsRender(
    fieldSchema['x-settings'] || 'PageSettings',
    fieldSchema['x-settings-props'],
  );
  if (!designable) {
    return null;
  }
  return (
    <SchemaToolbarProvider title={title}>
      <div className={'general-schema-designer'}>
        <div className={'general-schema-designer-icons'}>
          <Space size={2} align={'center'}>
            {render()}
          </Space>
        </div>
      </div>
    </SchemaToolbarProvider>
  );
};
