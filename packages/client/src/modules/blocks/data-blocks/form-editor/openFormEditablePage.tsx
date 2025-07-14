import { useState } from 'react';
import { ISchema, Schema, uid, useFieldSchema } from '@tachybase/schema';

import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';

import { SchemaSettingsItem } from '../../../../schema-settings';
import { EditableSelectedFieldProvider } from './EditableSelectedFieldContext';
import { EditableSelectedFormProvider } from './EditableSelectedFormContent';
import { FormSchemaEditor } from './FormSchemaEditor';

export const SchemaSettingsEditablePage = (props) => {
  const { collectionName } = props;
  const { t } = useTranslation();
  const [pendingOptions, setPendingOptions] = useState<any>(null);
  const schemaUID = pendingOptions?.schema['x-uid'] || null;
  const [visible, setVisible] = useState(false);
  const handleClose = () => {
    setVisible(false);
    setPendingOptions(null);
  };
  const fieldSchema = useFieldSchema();

  return (
    <div>
      <SchemaSettingsItem
        title={t('Open editable page')}
        onClick={() => {
          const rawSchema = cloneDeep(fieldSchema.toJSON());
          unpatchSchemaToolbars(rawSchema);
          const wrappedSchema = gridRowColWrap(rawSchema);
          const editableSchema = new Schema(wrappedSchema);

          setPendingOptions({
            schema: editableSchema,
            item: {
              name: fieldSchema['x-decorator-props']?.collection || collectionName,
            },
          });
          setVisible(true);
        }}
      />
      <EditableSelectedFormProvider>
        <EditableSelectedFieldProvider>
          <FormSchemaEditor key={schemaUID} open={visible} onCancel={handleClose} options={pendingOptions} />
        </EditableSelectedFieldProvider>
      </EditableSelectedFormProvider>
    </div>
  );
};

function unpatchSchemaToolbars(schema) {
  const patch = (node: ISchema) => {
    if (!node || typeof node !== 'object') return;
    if (node['x-uid']) {
      node['x-uid'] = uid();
    }
    if (node['x-toolbar'] === 'FormItemSchemaToolbar') {
      node['x-toolbar'] = 'EditableFormItemSchemaToolbar';
    }
    if (node['x-component'] === 'CardItem' && node['x-toolbar'] === 'BlockSchemaToolbar') {
      node['x-toolbar'] = 'EditableFormToolbar';
      node['x-settings'] = undefined;
    }
    if (node['x-component'] === 'Grid') {
      node['x-component'] = 'EditableGrid';
      node['x-initializer'] = undefined;
    }
    if (node['x-component'] === 'Grid.Col') {
      node['x-component'] = 'EditableGrid.Col';
    }
    if (node['x-component'] === 'Grid.Row') {
      node['x-component'] = 'EditableGrid.Row';
    }
    if (node['x-component'] === 'ActionBar' && node['x-initializer'] === 'createForm:configureActions') {
      node['x-initializer'] = undefined;
      node['properties'] = undefined;
    }

    if (node.properties) {
      for (const key of Object.keys(node.properties)) {
        patch(node.properties[key]);
      }
    }
  };
  patch(schema);
}

const gridRowColWrap = (schema: ISchema) => {
  return {
    type: 'void',
    'x-component': 'Grid.Row',
    properties: {
      [uid()]: {
        type: 'void',
        'x-component': 'Grid.Col',
        'x-component-props': {
          width: '100%',
        },
        properties: {
          [schema.name || uid()]: schema,
        },
      },
    },
  };
};
