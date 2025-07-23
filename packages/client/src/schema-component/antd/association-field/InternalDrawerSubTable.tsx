import React, { useContext, useState } from 'react';
import { Field, observer, useField, useFieldSchema } from '@tachybase/schema';

import { EditOutlined } from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import { useTranslation } from 'react-i18next';

import { useCollectionManager } from '../../../data-source';
import { FlagProvider } from '../../../flag-provider';
import { ActionContext, ActionContextProvider, OpenMode } from '../action/context';
import { SubFormProvider, useAssociationFieldContext } from './hooks';
import { InternalSubTable } from './InternalSubTable';
import { ReadPrettyInternalViewer } from './InternalViewer';

export const InternaDrawerSubTable = observer(
  (props) => {
    const { options } = useAssociationFieldContext();
    const [visible, setVisible] = useState(false);
    const { t } = useTranslation();
    const nesterProps = {
      ...props,
      shouldMountElement: true,
    };

    const titleProps = {
      ...props,
      enableLink: true,
    };

    const field = useField<Field>();
    const fieldSchema = useFieldSchema();
    const cm = useCollectionManager();

    const ctx = useContext(ActionContext);
    return (
      <>
        <span
          style={{ cursor: 'pointer', display: 'flex' }}
          onClick={() => {
            setVisible(true);
          }}
        >
          <div style={{ maxWidth: '95%' }}>
            <ReadPrettyInternalViewer {...titleProps} />
          </div>
          <EditOutlined style={{ display: 'inline-flex', marginLeft: '5px' }} />
        </span>
        <ActionContextProvider
          value={{
            ...ctx,
            visible,
            setVisible,
            openMode: OpenMode.DEFAULT,
          }}
        >
          <Drawer
            title={t(options?.uiSchema?.rawTitle)}
            open={visible}
            onClose={() => {
              setVisible(false);
            }}
            style={{ backgroundColor: '#f3f3f3' }}
            width={'70%'}
            destroyOnClose
            extra={
              <Button type="primary" onClick={() => setVisible(false)}>
                确认
              </Button>
            }
          >
            <FlagProvider isInSubForm>
              <SubFormProvider
                value={{ value: field.value, collection: cm.getCollection(fieldSchema['x-collection-field']) }}
              >
                <InternalSubTable {...nesterProps} />
              </SubFormProvider>
            </FlagProvider>
          </Drawer>
        </ActionContextProvider>
      </>
    );
  },
  { displayName: 'InternaDrawerSubTable' },
);
