import React from 'react';
import {
  css,
  SortableItem,
  useCollection,
  useDesigner,
  useTranslation,
  withDynamicSchemaProps,
} from '@tachybase/client';
import { useFieldSchema } from '@tachybase/schema';

import { Image, JumboTabs } from 'antd-mobile';

// import { useActionImageSearchItemView } from '../hooks/useAction.ImageSearchItemView';

export const ImageSearchItemView = withDynamicSchemaProps(
  (props) => {
    const { collectionField, Designer, items, onSelect } = useAction(props);

    if (!collectionField) {
      return null;
    }

    return (
      <SortableItem>
        <Designer />
        <JumboTabs onChange={onSelect}>
          {items.map(({ key, label, imageUrl }) => (
            <JumboTabs.Tab key={key} title={''} description={<ImageDescription srcUrl={imageUrl} label={label} />} />
          ))}
        </JumboTabs>
      </SortableItem>
    );
  },
  { displayName: 'ImageSearchItemView' },
);

function useAction(props) {
  const { list, onSelected, valueKey: _valueKey, labelKey: _labelKey, filterKey } = props;
  const fieldSchema = useFieldSchema();
  const collection = useCollection();
  const { t } = useTranslation();
  const collectionField = React.useMemo(
    () => collection?.getField(fieldSchema['fieldName'] as any),
    [collection, fieldSchema['fieldName']],
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

  const itemsData = (list || []).map((item) => {
    const { type, ['image_show']: imageObj, [fieldNames.title]: label, [fieldNames.key]: key } = item;

    // TODO: 需要更好的处理url方式
    const origin = location?.origin || '';
    const sourceUrl = imageObj?.[0]?.url;
    let imageUrl = sourceUrl ?? '';
    if (!imageUrl.includes('http')) {
      imageUrl = `${origin}${sourceUrl}`;
    }

    if (type === 'all') {
      return {
        label: t('AllProducts'),
        key: 'all',
        imageUrl: imageUrl,
      };
    }

    return {
      label,
      key,
      imageUrl: imageUrl,
    };
  });

  return {
    collectionField,
    Designer,
    items: itemsData,
    onSelect,
  };
}

const ImageDescription = (props) => {
  const { srcUrl, label } = props;
  return (
    <div
      className={css`
        display: 'flex';
        flex-direction: 'column';
        width: '100%';
        height: '100%';
        :active {
          background-color: transparent;
        }
      `}
    >
      <Image src={srcUrl} width={100} height={100} fit="fill" />
      <p
        className={css`
          font-weight: 400;
          font-size: 17.6px;
          line-height: 1;
        `}
      >
        {label}
      </p>
    </div>
  );
};
