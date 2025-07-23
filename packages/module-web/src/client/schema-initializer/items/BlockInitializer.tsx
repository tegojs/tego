import React from 'react';
import { merge } from '@tachybase/schema';

import { SchemaInitializerItem, useSchemaInitializer, useSchemaInitializerItem } from '../../application';

// Block
export const BlockInitializer = (props) => {
  const { item, schema, ...others } = props;
  const { insert } = useSchemaInitializer();
  return (
    <SchemaInitializerItem
      {...others}
      onClick={() => {
        const s = merge(schema || {}, item.schema || {});
        item?.schemaInitialize?.(s);
        insert(s);
        props.onClick?.(s);
      }}
    />
  );
};

export const BlockItemInitializer = () => {
  const itemConfig = useSchemaInitializerItem();
  const { schema, ...others } = itemConfig;
  return <BlockInitializer {...others} item={itemConfig} />;
};
