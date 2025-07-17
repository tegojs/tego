import React, { useContext, useState } from 'react';
import {
  ActionContextProvider,
  css,
  cx,
  DndContext,
  RecordProvider,
  SchemaComponentOptions,
  useCollectionParentRecordData,
} from '@tachybase/client';
import { FormLayout } from '@tachybase/components';
import { observer, RecursionField, useFieldSchema } from '@tachybase/schema';

import { Card } from 'antd';

import { KanbanCardContext } from './context';

export const KanbanCard: any = observer(
  (props: any) => {
    const { setDisableCardDrag, cardViewerSchema, card, cardField, columnIndex, cardIndex } =
      useContext(KanbanCardContext);
    const parentRecordData = useCollectionParentRecordData();
    const fieldSchema = useFieldSchema();
    const [visible, setVisible] = useState(false);
    return (
      <SchemaComponentOptions components={{}} scope={{}}>
        <Card
          onClick={(e) => {
            const targetElement = e.target as Element; // 将事件目标转换为Element类型
            const currentTargetElement = e.currentTarget as Element;
            if (currentTargetElement.contains(targetElement)) {
              setVisible(true);
              e.stopPropagation();
            } else {
              e.stopPropagation();
            }
          }}
          bordered={false}
          hoverable
          style={{ cursor: 'pointer', overflow: 'hidden' }}
          // bodyStyle={{ paddingBottom: 0 }}
          className={cx(css`
            .ant-card-body {
              padding: 16px;
            }
            .tb-row-divider {
              height: 16px;
              margin-top: -16px;
              &:last-child {
                margin-top: 0;
              }
            }
            .ant-description-input {
              text-overflow: ellipsis;
              width: 100%;
              overflow: hidden;
            }
            .ant-description-textarea {
              text-overflow: ellipsis;
              width: 100%;
              overflow: hidden;
            }
            .ant-formily-item {
              margin-bottom: 12px;
            }
            .tb-grid-row:last-of-type {
              .tb-grid-col {
                .tb-form-item:last-of-type {
                  .ant-formily-item {
                    margin-bottom: 0;
                  }
                }
              }
            }
            .ant-formily-item-control .ant-space-item: {
              whitespace: normal;
              wordbreak: break-all;
              wordwrap: break-word;
            }
            .ant-formily-item-label {
              color: #8c8c8c;
              fontweight: normal;
            }
          `)}
        >
          <DndContext
            onDragStart={() => {
              setDisableCardDrag(true);
            }}
            onDragEnd={() => {
              setDisableCardDrag(false);
            }}
          >
            <FormLayout layout={'vertical'}>
              <RecursionField
                basePath={cardField.address.concat(`${columnIndex}.cards.${cardIndex}`)}
                schema={fieldSchema}
                onlyRenderProperties
              />
            </FormLayout>
          </DndContext>
        </Card>
        {cardViewerSchema && (
          <ActionContextProvider
            value={{
              openMode: fieldSchema['x-component-props']?.['openMode'] || 'drawer',
              openSize: fieldSchema['x-component-props']?.['openSize'],
              visible,
              setVisible,
            }}
          >
            <RecordProvider record={card} parent={parentRecordData}>
              <RecursionField
                basePath={cardField.address.concat(`${columnIndex}.cardViewer.${cardIndex}`)}
                schema={cardViewerSchema}
                onlyRenderProperties
              />
            </RecordProvider>
          </ActionContextProvider>
        )}
      </SchemaComponentOptions>
    );
  },
  { displayName: 'KanbanCard' },
);
