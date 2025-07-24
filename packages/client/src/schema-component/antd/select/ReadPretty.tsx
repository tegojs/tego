import React from 'react';
import { isArrayField, isValid, observer, useField, useFieldSchema } from '@tachybase/schema';

import { Tag } from 'antd';

import { useCollectionField } from '../../../data-source/collection-field/CollectionFieldProvider';
import { EllipsisWithTooltip } from '../input/EllipsisWithTooltip';
import { defaultFieldNames, getCurrentOptions } from './utils';

export const ReadPretty = observer(
  (props: any) => {
    const fieldNames = { ...defaultFieldNames, ...props.fieldNames };
    const field = useField<any>();

    if (!isValid(props.value)) {
      return <div />;
    }
    if (isArrayField(field) && field?.value?.length === 0) {
      return <div />;
    }
    const collectionField = useCollectionField();
    const fieldSchema = useFieldSchema();
    const dataSource = field.dataSource || props.options || collectionField?.uiSchema.enum || [];
    const options = getCurrentOptions(field.value, dataSource, fieldNames);
    const currentOptions = getFormulaValue(
      fieldSchema['x-component-props'].fieldNames?.['formula'],
      options,
      fieldSchema,
    );
    return (
      <div>
        <EllipsisWithTooltip ellipsis={props.ellipsis}>
          {currentOptions.map((option, key) => (
            <Tag key={key} color={option[fieldNames.color]} icon={option.icon}>
              {option[fieldNames.label]}
            </Tag>
          ))}
        </EllipsisWithTooltip>
      </div>
    );
  },
  { displayName: 'ReadPretty' },
);

const getFormulaValue = (template, options, fieldSchema) => {
  if (!template) {
    return options;
  }
  return options.map((item) => {
    const label = item.label;
    const customLabel = template.replace(new RegExp(`{{${fieldSchema['name']}}}`, 'g'), label);
    return { ...item, label: customLabel };
  });
};
