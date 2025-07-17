import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionContextProvider,
  CollectionProvider_deprecated,
  FormProvider,
  OpenMode,
  RecordProvider,
  useDesignable,
  useRequest,
} from '@tachybase/client';
import { connect, ISchema, observer, RecursionField, useField, useFieldSchema, useForm } from '@tachybase/schema';

import _ from 'lodash';

const viewerSchema: ISchema = {
  type: 'void',
  title: '{{ t("View record") }}',
  'x-component': 'AssociationField.Viewer',
  'x-component-props': {
    className: 'tb-action-popup',
  },
  properties: {
    tabs: {
      type: 'void',
      'x-component': 'Tabs',
      'x-component-props': {},
      'x-initializer': 'popup:addTab',
      properties: {
        tab1: {
          type: 'void',
          title: '{{t("Details")}}',
          'x-component': 'Tabs.TabPane',
          'x-designer': 'Tabs.Designer',
          'x-component-props': {},
          properties: {
            grid: {
              type: 'void',
              'x-component': 'Grid',
              'x-initializer': 'RecordBlockInitializers',
              properties: {},
            },
          },
        },
      },
    },
  },
};

export const useInsertSchema = (component) => {
  const fieldSchema = useFieldSchema();
  const { insertAfterBegin } = useDesignable();
  const insert = useCallback(
    (ss) => {
      const schema = fieldSchema.reduceProperties((buf, s) => {
        if (s['x-component'] === 'AssociationField.' + component) {
          return s;
        }
        return buf;
      }, null);
      if (!schema) {
        insertAfterBegin(_.cloneDeep(ss));
      }
    },
    [component],
  );
  return insert;
};

const AssociatedFieldImplement = observer<any>((props) => {
  const { collection, fieldExp, dateFieldExp, sourceCollection, sourceField } = props;
  const [visible, setVisible] = useState<boolean>(false);
  const insertViewer = useInsertSchema('Viewer');
  const field = useField();
  const form = useForm();
  const fieldSchema = useFieldSchema();
  const { designable } = useDesignable();
  const fieldName = fieldExp?.replace(/{{(.*?)}}/, '$1');
  const dateFieldName = dateFieldExp?.replace(/{{(.*?)}}/, '$1');

  const { data, loading, run } = useRequest<{ data: any }>(
    {
      url: `/${sourceCollection}:get`,
      params: {
        appends: [sourceField],
        filter: {
          contract_id: form.values[fieldName]?.id,
          start_date: { $lte: form.values[dateFieldName] },
          end_date: { $gte: form.values[dateFieldName] },
        },
      },
    },
    {
      manual: true,
    },
  );
  useEffect(() => {
    if (form.values[fieldName]?.id && form.values[dateFieldName]) {
      run();
    }
  }, [form.values[fieldName]?.id, form.values[dateFieldName]]);

  if (loading || !data) {
    return null;
  }
  if (!data.data?.[sourceField + '_id']) {
    form.setValues({
      // FIXME should add base path
      [fieldSchema.name]: null,
    });
    return null;
  }
  const record = data.data[sourceField];
  form.setValues({
    // FIXME should add base path
    [fieldSchema.name]: record,
  });
  return (
    <span>
      <a
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (designable) {
            insertViewer(viewerSchema);
          }
          setVisible(true);
        }}
      >
        {record.name}
      </a>
      <CollectionProvider_deprecated name={collection}>
        <ActionContextProvider value={{ visible, setVisible, openMode: OpenMode.DEFAULT, snapshot: false }}>
          <RecordProvider record={record}>
            <FormProvider>
              <RecursionField
                schema={fieldSchema}
                onlyRenderProperties
                basePath={field.address}
                filterProperties={(s) => {
                  return s['x-component'] === 'AssociationField.Viewer';
                }}
              />
            </FormProvider>
          </RecordProvider>
        </ActionContextProvider>
      </CollectionProvider_deprecated>
    </span>
  );
});

export const AssociatedField = connect(AssociatedFieldImplement);
