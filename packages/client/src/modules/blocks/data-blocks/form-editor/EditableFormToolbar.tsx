import React, { FC, useContext, useEffect, useMemo, useRef } from 'react';
import { Field, useField, useFieldSchema, useForm } from '@tachybase/schema';

import {
  SchemaComponentsContext,
  SchemaExpressionScopeContext,
  SchemaMarkupContext,
} from '../../../../../../schema/src/react';
import { useFormBlockContext } from '../../../../block-provider';
import { useSchemaOptionsContext } from '../../../../schema-component';
import { useEditableSelectedForm } from './EditableSelectedFormContent';

export const EditableFormToolbar = () => {
  const fieldSchema = useFieldSchema();
  const form = useForm();
  const field = useField<Field>();
  const schemaMarkup = useContext(SchemaMarkupContext);
  const expressionScope = useContext(SchemaExpressionScopeContext);
  const schemaComponents = useContext(SchemaComponentsContext);
  const formBlockValue = useFormBlockContext();
  const schemaOptions = useSchemaOptionsContext();
  const { setEditableForm } = useEditableSelectedForm();

  useEffect(() => {
    setEditableForm({
      field,
      fieldSchema,
      schemaMarkup,
      expressionScope,
      schemaComponents,
      schemaOptions,
      form,
      formBlockValue,
    });
  }, []);

  return null;
};
