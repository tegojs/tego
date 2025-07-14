import React from 'react';
import { SortableItem, useCollection, useDesigner, useTranslation, withDynamicSchemaProps } from '@tachybase/client';
import { useFieldSchema } from '@tachybase/schema';

import { MenuProps } from 'antd';
import { Tabs } from 'antd-mobile';

export const TabSearchFieldMItem = withDynamicSchemaProps(
  (props) => {
    const { collectionField, Designer, items, onSelect } = useAction(props);

    if (!collectionField) {
      return null;
    }

    return (
      <SortableItem>
        <Designer />
        <Tabs style={{ '--title-font-size': '12px', color: '#a5a5a5' }} onChange={onSelect}>
          {items.map((value: any) => (
            <Tabs.Tab title={value.label} key={value.key} />
          ))}
        </Tabs>
      </SortableItem>
    );
  },
  { displayName: 'TabSearchFieldItem' },
);

export const useAction = (props) => {
  const { list, onSelected, valueKey: _valueKey, labelKey: _labelKey, filterKey } = props;
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const c = useCollection();
  const collectionField = React.useMemo(
    () => c?.getField(fieldSchema['fieldName'] as any),
    [c, fieldSchema['fieldName']],
  );
  const Designer = useDesigner();
  const valueKey = _valueKey || collectionField?.targetKey || 'id';
  const labelKey = _labelKey || fieldSchema['x-component-props']?.fieldNames?.label || valueKey;
  const onSelect = (itemKey) => {
    const key = itemKey.keyPath?.[0] || itemKey;
    onSelected([key], filterKey);
  };
  const fieldNames = {
    title: labelKey || valueKey,
    key: valueKey,
  };
  const items: MenuProps['items'] = [];

  if (list?.length) {
    list.forEach((value) => {
      items.push({
        label: value[fieldNames.title],
        key: value[fieldNames.key],
      });
    });
  }
  items?.unshift({
    label: t('all'),
    key: 'all',
  });

  return {
    collectionField,
    Designer,
    items,
    onSelect,
  };
};
