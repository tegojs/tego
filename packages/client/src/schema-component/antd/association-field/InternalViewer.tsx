import React, { Fragment, useRef, useState } from 'react';
import { observer, RecursionField, toArr, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { useColumnSchema, useDesignable } from '../../';
import { BlockAssociationContext, WithoutTableFieldResource } from '../../../block-provider';
import { CollectionProvider_deprecated, useCollectionManager_deprecated } from '../../../collection-manager';
import { Collection } from '../../../data-source';
import { DeclareVariable } from '../../../modules/variable/DeclareVariable';
import { RecordProvider, useRecord } from '../../../record-provider';
import { FormProvider } from '../../core';
import { useCompile } from '../../hooks';
import { ActionContextProvider, useActionContext } from '../action';
import { EllipsisWithTooltip } from '../input/EllipsisWithTooltip';
import { useAssociationFieldContext, useCustomTitle, useFieldNames, useInsertSchema } from './hooks';
import { transformNestedData } from './InternalCascadeSelect';
import schema from './schema';
import { getLabelFormatValue, useLabelUiSchemaV2 } from './util';

interface IEllipsisWithTooltipRef {
  setPopoverVisible: (boolean) => void;
}

const toValue = (value, placeholder) => {
  if (value === null || value === undefined) {
    return placeholder;
  }
  return value;
};
export function isObject(value) {
  return typeof value === 'object' && value !== null;
}
export const ReadPrettyInternalViewer = observer(
  (props: any) => {
    const { t } = useTranslation();
    const fieldSchema = useFieldSchema();
    const recordCtx = useRecord();
    const { getCollection } = useCollectionManager_deprecated();
    const { enableLink } = fieldSchema['x-component-props'] || {};
    // value 做了转换，但 props.value 和原来 useField().value 的值不一致
    const field = useField();
    const defFieldNames = useFieldNames(props);
    const [visible, setVisible] = useState(false);
    const insertViewer = useInsertSchema('Viewer');
    const { options: collectionField } = useAssociationFieldContext();
    const [record, setRecord] = useState({});
    const compile = useCompile();
    const { designable } = useDesignable();
    const { snapshot } = useActionContext();
    const targetCollection = getCollection(collectionField?.target);
    const isTreeCollection = targetCollection?.template === 'tree';
    const ellipsisWithTooltipRef = useRef<IEllipsisWithTooltipRef>();
    const getLabelUiSchema = useLabelUiSchemaV2();
    const { formulaRecord, fieldNames } = useCustomTitle(recordCtx, fieldSchema, defFieldNames);
    const renderRecords = () =>
      toArr(formulaRecord[fieldSchema['name']] || props.value).map((record, index, arr) => {
        const value = record?.[fieldNames?.label || 'label'];
        const label = isTreeCollection
          ? transformNestedData(record)
              .map((o) => o?.[fieldNames?.label || 'label'])
              .join(' / ')
          : isObject(value)
            ? getCollection(targetCollection?.fieldsMap?.[fieldNames?.label || 'label']?.target)?.options?.titleField
              ? value[
                  getCollection(targetCollection?.fieldsMap?.[fieldNames?.label || 'label']?.target)?.options
                    ?.titleField
                ]
              : JSON.stringify(value)
            : value;
        const val = toValue(compile(label), 'N/A');
        const labelUiSchema = getLabelUiSchema(
          record?.__collection || collectionField?.target,
          fieldNames?.label || 'label',
        );
        const text = getLabelFormatValue(compile(labelUiSchema), val, true);
        return (
          <Fragment key={`${record?.id}_${index}`}>
            <span>
              {snapshot ? (
                text
              ) : enableLink !== false ? (
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (designable) {
                      insertViewer(schema.Viewer);
                    }
                    setVisible(true);
                    setRecord(record);
                    ellipsisWithTooltipRef?.current?.setPopoverVisible(false);
                  }}
                >
                  {text}
                </a>
              ) : (
                text
              )}
            </span>
            {index < arr.length - 1 ? <span style={{ marginRight: 4, color: '#aaa' }}>,</span> : null}
          </Fragment>
        );
      });
    const renderWithoutTableFieldResourceProvider = () => (
      <DeclareVariable
        name="$nPopupRecord"
        title={t('Current popup record')}
        value={record}
        collection={targetCollection as Collection}
      >
        <WithoutTableFieldResource.Provider value={true}>
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
        </WithoutTableFieldResource.Provider>
      </DeclareVariable>
    );

    const renderRecordProvider = () => {
      const collectionFieldNames = fieldSchema?.['x-collection-field']?.split('.');
      //替换了原来的recordCtx[collectionFieldNames[1]]  formulaRecord加上了替换后的字段和原始数据
      return collectionFieldNames && collectionFieldNames.length > 2 ? (
        <RecordProvider record={record} parent={formulaRecord[collectionFieldNames[1]]}>
          {renderWithoutTableFieldResourceProvider()}
        </RecordProvider>
      ) : (
        <RecordProvider record={record} parent={formulaRecord}>
          {renderWithoutTableFieldResourceProvider()}
        </RecordProvider>
      );
    };

    return (
      <div>
        <BlockAssociationContext.Provider value={`${collectionField?.collectionName}.${collectionField?.name}`}>
          <CollectionProvider_deprecated name={collectionField?.target ?? collectionField?.targetCollection}>
            <EllipsisWithTooltip ellipsis={true} ref={ellipsisWithTooltipRef}>
              {renderRecords()}
            </EllipsisWithTooltip>
            <ActionContextProvider
              value={{
                visible,
                setVisible,
                openMode: 'drawer',
                snapshot: collectionField?.interface === 'snapshot',
                fieldSchema: fieldSchema,
              }}
            >
              {renderRecordProvider()}
            </ActionContextProvider>
          </CollectionProvider_deprecated>
        </BlockAssociationContext.Provider>
      </div>
    );
  },
  { displayName: 'ReadPrettyInternalViewer' },
);
