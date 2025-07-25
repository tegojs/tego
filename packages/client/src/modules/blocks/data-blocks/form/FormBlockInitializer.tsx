import React, { useCallback, useState } from 'react';
import { ISchema, Schema, uid, useFieldSchema } from '@tachybase/schema';

import { FormOutlined } from '@ant-design/icons';

import { useSchemaInitializer, useSchemaInitializerItem } from '../../../../application';
import { useAssociationName } from '../../../../data-source/collection/AssociationProvider';
import { Collection, CollectionFieldOptions } from '../../../../data-source/collection/Collection';
import { useDesignable, useSchemaComponentContext } from '../../../../schema-component';
import { DataBlockInitializer } from '../../../../schema-initializer/items/DataBlockInitializer';
import { findSchema } from '../../../../schema-initializer/utils';
import { createCreateFormEditUISchema, EditableSelectedFieldProvider, FormSchemaEditor } from '../form-editor';
import { EditableSelectedFormProvider } from '../form-editor/EditableSelectedFormContent';
import { createCreateFormBlockUISchema } from './createCreateFormBlockUISchema';

export const FormBlockInitializer = ({
  filterCollections,
  onlyCurrentDataSource,
  hideSearch,
  createBlockSchema,
  componentType = 'FormItem',
  templateWrap: customizeTemplateWrap,
  showAssociationFields,
  hideChildrenIfSingleCollection,
  hideOtherRecordsInPopup,
  currentText,
  otherText,
}: {
  filterCollections: (options: { collection?: Collection; associationField?: CollectionFieldOptions }) => boolean;
  onlyCurrentDataSource: boolean;
  hideSearch?: boolean;
  createBlockSchema?: (options: any) => any;
  /**
   * 虽然这里的命名现在看起来比较奇怪，但为了兼容旧版本的 template，暂时保留这个命名。
   */
  componentType?: 'FormItem';
  templateWrap?: (
    templateSchema: any,
    {
      item,
    }: {
      item: any;
    },
  ) => any;
  showAssociationFields?: boolean;
  hideChildrenIfSingleCollection?: boolean;
  /**
   * 隐藏弹窗中的 Other records 选项
   */
  hideOtherRecordsInPopup?: boolean;
  /** 用于更改 Current record 的文案 */
  currentText?: string;
  /** 用于更改 Other records 的文案 */
  otherText?: string;
}) => {
  const [visible, setVisible] = useState(false);
  const [pendingOptions, setPendingOptions] = useState<any>(null);
  const schemaUID = pendingOptions?.schema['x-uid'] || null;
  const itemConfig = useSchemaInitializerItem();
  const { createFormBlock, templateWrap, createEditFormBlock } = useCreateFormBlock();
  const onCreateFormBlockSchema = useCallback((options) => {
    if (createBlockSchema) {
      return createBlockSchema(options);
    }
    const schema = new Schema(createEditFormBlock(options));
    setPendingOptions({ schema, ...options });
    setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setPendingOptions(null);
  };

  return (
    <>
      <DataBlockInitializer
        {...itemConfig}
        icon={<FormOutlined />}
        componentType={componentType}
        templateWrap={(templateSchema, options) => {
          if (customizeTemplateWrap) {
            return customizeTemplateWrap(templateSchema, options);
          }

          return templateWrap(templateSchema, options);
        }}
        onCreateBlockSchema={onCreateFormBlockSchema}
        filter={filterCollections}
        onlyCurrentDataSource={onlyCurrentDataSource}
        hideSearch={hideSearch}
        showAssociationFields={showAssociationFields}
        hideChildrenIfSingleCollection={hideChildrenIfSingleCollection}
        hideOtherRecordsInPopup={hideOtherRecordsInPopup}
        currentText={currentText}
        otherText={otherText}
      />
      <EditableSelectedFormProvider>
        <EditableSelectedFieldProvider>
          <FormSchemaEditor key={schemaUID} open={visible} onCancel={handleClose} options={pendingOptions} />
        </EditableSelectedFieldProvider>
      </EditableSelectedFormProvider>
    </>
  );
};

export const useCreateFormBlock = () => {
  const { insert } = useSchemaInitializer();
  const association = useAssociationName();
  const { isCusomeizeCreate: isCustomizeCreate } = useSchemaInitializerItem();

  const createFormBlock = useCallback(
    ({ item, fromOthersInPopup }) => {
      if (fromOthersInPopup) {
        insert(
          createCreateFormBlockUISchema({
            collectionName: item.collectionName || item.name,
            dataSource: item.dataSource,
            isCusomeizeCreate: true,
          }),
        );
      } else {
        insert(
          createCreateFormBlockUISchema(
            association
              ? {
                  association,
                  dataSource: item.dataSource,
                  isCusomeizeCreate: isCustomizeCreate,
                }
              : {
                  collectionName: item.collectionName || item.name,
                  dataSource: item.dataSource,
                  isCusomeizeCreate: isCustomizeCreate,
                },
          ),
        );
      }
    },
    [association, insert, isCustomizeCreate],
  );

  const templateWrap = (templateSchema, { item }) => {
    const schema = createCreateFormBlockUISchema({
      isCusomeizeCreate: isCustomizeCreate,
      dataSource: item.dataSource,
      templateSchema: templateSchema,
      collectionName: item.name,
      association,
    });
    if (item.template && item.mode === 'reference') {
      schema['x-template-key'] = item.template.key;
    }
    return schema;
  };

  const createEditFormBlock = ({ item, fromOthersInPopup }) => {
    const schema = fromOthersInPopup
      ? createCreateFormEditUISchema({
          collectionName: item.collectionName || item.name,
          dataSource: item.dataSource,
          isCusomeizeCreate: true,
        })
      : createCreateFormEditUISchema(
          association
            ? {
                association,
                dataSource: item.dataSource,
                isCusomeizeCreate: isCustomizeCreate,
              }
            : {
                collectionName: item.collectionName || item.name,
                dataSource: item.dataSource,
                isCusomeizeCreate: isCustomizeCreate,
              },
        );
    return gridRowColWrap(schema);
  };

  return {
    createFormBlock,
    templateWrap,
    createEditFormBlock,
  };
};

const gridRowColWrap = (schema: ISchema) => {
  return {
    type: 'void',
    'x-component': 'Grid.Row',
    properties: {
      [uid()]: {
        type: 'void',
        'x-component': 'Grid.Col',
        properties: {
          [schema.name || uid()]: schema,
        },
      },
    },
  };
};
