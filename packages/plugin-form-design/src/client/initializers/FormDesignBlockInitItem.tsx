import { SchemaInitializerItem, useSchemaInitializerItem } from '@tachybase/client';

export const FormDesignBlockInitItem = () => {
  const schemaInitializerItem = useSchemaInitializerItem();

  const handleClick = () => {
    // do something
  };
  return <SchemaInitializerItem {...schemaInitializerItem} onClick={handleClick} />;
};
