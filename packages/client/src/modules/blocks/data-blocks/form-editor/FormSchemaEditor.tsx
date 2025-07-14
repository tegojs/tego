import { useEffect, useState } from 'react';
import { useAPIClient, useTranslation } from '@tachybase/client';
import { ISchema, Schema, uid } from '@tachybase/schema';

import { Layout, Modal } from 'antd';
import _ from 'lodash';

import { PageRefreshProvider } from '../../../../built-in/dynamic-page/PageRefreshContext';
import { CollectionContext, useCollectionManager } from '../../../../data-source';
import { DndContext, useDesignable } from '../../../../schema-component';
import { createEditableDesignable } from './EditableDesignable';
import { EditorContent } from './EditorContent';
import { EditorFieldFormProperty } from './EditorFieldFormProperty';
import { EditorFieldsSider } from './EditorFieldsSider';
import { EditorHeader } from './EditorHeader';
import { useStyles } from './styles';

interface CreateFormBlockUISchemaOptions {
  dataSource: string;
  collectionName?: string;
  association?: string;
  templateSchema?: ISchema;
  isCusomeizeCreate?: boolean;
}

export const FormSchemaEditor = ({ open, onCancel, options }) => {
  const [schema, setSchema] = useState<Schema>(() => new Schema({}));
  const [schemakey, setSchemakey] = useState(uid());
  const { refresh } = useDesignable();
  const api = useAPIClient();
  const { t } = useTranslation();
  const { styles } = useStyles();
  const collectionName = options?.item?.collectionName || options?.item?.name || null;
  const collectionManager = useCollectionManager();
  const collection = collectionManager.getCollection(collectionName);

  const eddn = createEditableDesignable({
    t,
    api,
    refresh,
    current: schema,
  });
  useEffect(() => {
    if (options?.schema) {
      setSchema(options?.schema);
    }
  }, [options]);
  return (
    <Modal open={open} footer={null} width="100vw" closable={false} className={styles.editModel}>
      <PageRefreshProvider>
        <CollectionContext.Provider value={collection}>
          <DndContext>
            <Layout style={{ height: '100%' }}>
              <EditorHeader onCancel={onCancel} schema={schema} />
              <Layout>
                <EditorFieldsSider schema={schema} setSchemakey={setSchemakey} eddn={eddn} />
                <EditorContent key={schemakey} schema={schema} />
                <EditorFieldFormProperty schema={schema} setSchemakey={setSchemakey} eddn={eddn} />
              </Layout>
            </Layout>
          </DndContext>
        </CollectionContext.Provider>
      </PageRefreshProvider>
    </Modal>
  );
};

export function createCreateFormEditUISchema(options: CreateFormBlockUISchemaOptions): ISchema {
  const { collectionName, association, dataSource, templateSchema, isCusomeizeCreate } = options;
  const resourceName = association || collectionName;
  if (!dataSource) {
    throw new Error('dataSource are required');
  }
  if (!resourceName) {
    throw new Error('association or collectionName is required');
  }
  const schema: ISchema = {
    type: 'void',
    'x-acl-action-props': {
      skipScopeCheck: true,
    },
    'x-acl-action': `${resourceName}:create`,
    'x-decorator': 'FormBlockProvider',
    'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
    'x-decorator-props': {
      dataSource,
      collection: collectionName,
      association,
      // isCusomeizeCreate,
    },
    'x-toolbar': 'EditableFormToolbar',
    // 'x-settings': 'blockEditableSettings:createForm',
    'x-component': 'CardItem',
    properties: {
      [uid()]: {
        type: 'void',
        'x-component': 'FormV2',
        'x-use-component-props': 'useCreateFormBlockProps',
        properties: {
          [uid()]: {
            type: 'void',
            // 'x-initializer': 'createForm:configureActions',
            'x-component': 'ActionBar',
            'x-component-props': {
              // layout: 'one-column',
              style: {
                marginBottom: 24,
              },
            },
          },
          grid: templateSchema || {
            type: 'void',
            'x-component': 'EditableGrid',
            // 'x-initializer': 'form:configureFields',
            properties: {
              // ...fieldsSchema
            },
          },
        },
      },
    },
  };
  return schema;
}
