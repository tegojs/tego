import { useFieldSchema } from '@tachybase/schema';

import { useDesignable } from '../..';
import { useSchemaSettingsRender } from '../../../application/schema-settings/hooks';
import { SchemaToolbarProvider } from '../../../application/schema-toolbar/context';

export const PageTabDesigner = ({ schema }) => {
  const { designable } = useDesignable();
  const fieldSchema = useFieldSchema();
  const { render: renderDesigner } = useSchemaSettingsRender(
    fieldSchema['x-settings'] || 'PageTabSettings',
    fieldSchema['x-settings-props'],
  );

  if (!designable) {
    return null;
  }
  return <SchemaToolbarProvider schema={schema}>{renderDesigner()}</SchemaToolbarProvider>;
};
