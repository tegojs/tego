import React, { FC, useContext, useEffect, useMemo, useRef } from 'react';
import { Field, useField, useFieldSchema, useForm } from '@tachybase/schema';

import { DeleteOutlined, DragOutlined, PlusOutlined } from '@ant-design/icons';
import { Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  SchemaComponentsContext,
  SchemaExpressionScopeContext,
  SchemaMarkupContext,
} from '../../../../../../schema/src/react';
import { useFormActiveFields, useFormBlockContext } from '../../../../block-provider';
import {
  DragHandler,
  SortableContext,
  Space,
  useDesignable,
  useSchemaOptionsContext,
} from '../../../../schema-component';
import { SchemaToolbarProps, useGetAriaLabelOfDesigner } from '../../../../schema-settings';
import { useEditableDesignable } from './EditableDesignable';
import { useEditableSelectedField } from './EditableSelectedFieldContext';
import { useStyles } from './styles';

export const EditableFormItemSchemaToolbar = (props) => {
  return <EditableSchemaToolbar showBorder={false} showBackground {...props} />;
};

export const EditableSchemaToolbar: FC<SchemaToolbarProps> = (props) => {
  const { designable } = useDesignable();

  if (!designable) {
    return null;
  }

  return <EditableInternalSchemaToolbar {...props} />;
};

const EditableInternalSchemaToolbar: FC<SchemaToolbarProps> = (props) => {
  const { title, initializer, settings, showBackground, showBorder = true } = props;
  const { designable } = useDesignable();
  const fieldSchema = useFieldSchema();
  const form = useForm();
  const schemaMarkup = useContext(SchemaMarkupContext);
  const expressionScope = useContext(SchemaExpressionScopeContext);
  const schemaComponents = useContext(SchemaComponentsContext);
  const formBlockValue = useFormBlockContext();
  const schemaOptions = useSchemaOptionsContext();
  const { t } = useTranslation();
  const field = useField<Field>();
  const { styles } = useStyles();
  const { getAriaLabel } = useGetAriaLabelOfDesigner();
  const { setEditableField } = useEditableSelectedField();
  const { removeActiveFieldName } = useFormActiveFields() || {};
  const { dn } = useEditableDesignable();

  const { draggable } = useContext(SortableContext);

  const dragElement = useMemo(() => {
    if (draggable === false) return null;
    return (
      <DragHandler>
        <DragOutlined role="button" aria-label={getAriaLabel('drag-handler')} />
      </DragHandler>
    );
  }, [draggable, getAriaLabel]);

  const deleteElement = useMemo(() => {
    return (
      <Popconfirm
        title={t('Delete field')}
        description=""
        icon={null}
        okType="danger"
        okText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={() => {
          const options = {
            removeParentsIfNoChildren: true,
            breakRemoveOn: {
              'x-component': 'EditableGrid',
            },
          };
          if (field?.required) {
            field.required = false;
            fieldSchema['required'] = false;
          }
          dn.remove(null, options);
          delete form.values[fieldSchema.name];
          removeActiveFieldName?.(fieldSchema.name as string);
          if (field?.setInitialValue && field?.reset) {
            field.setInitialValue(null);
            field.reset();
          }
        }}
      >
        <DeleteOutlined role="button" style={{ cursor: 'pointer' }} />
      </Popconfirm>
    );
  }, []);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toolbarElement = toolbarRef.current;
    const parentElement = toolbarElement?.parentElement;
    function show() {
      if (toolbarElement) {
        toolbarElement.style.display = 'block';
      }
    }

    function hide() {
      if (toolbarElement) {
        toolbarElement.style.display = 'none';
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const isInsideToolbar = toolbarElement?.contains(target);
      if (!isInsideToolbar) {
        // const uid = fieldSchema?.['x-uid'] || null;
        setEditableField({
          field,
          fieldSchema,
          schemaMarkup,
          expressionScope,
          schemaComponents,
          schemaOptions,
          form,
          formBlockValue,
        });
      }
    }

    if (parentElement) {
      const style = window.getComputedStyle(parentElement);
      if (style.position === 'static') {
        parentElement.style.position = 'relative';
      }

      parentElement.addEventListener('mouseenter', show);
      parentElement.addEventListener('mouseleave', hide);
      parentElement.addEventListener('click', handleClick);
    }

    return () => {
      if (parentElement) {
        parentElement.removeEventListener('mouseenter', show);
        parentElement.removeEventListener('mouseleave', hide);
        parentElement.removeEventListener('click', handleClick);
      }
    };
  }, []);

  if (!designable) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbar}
      style={{ border: showBorder ? 'auto' : 0, background: showBackground ? 'auto' : 0 }}
    >
      <div className={styles.toolbarIcons}>
        <Space size={3} align={'center'}>
          {dragElement}
          {deleteElement}
        </Space>
      </div>
    </div>
  );
};
