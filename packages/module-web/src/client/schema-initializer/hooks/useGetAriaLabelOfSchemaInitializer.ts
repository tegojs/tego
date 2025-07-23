import { useCallback } from 'react';
import { useCollection_deprecated } from '@tachybase/client';
import { useFieldSchema } from '@tachybase/schema';

/**
 * label = 'schema-initializer' + x-component + [x-initializer] + [collectionName] + [postfix]
 * @returns
 */

export const useGetAriaLabelOfSchemaInitializer = () => {
  const fieldSchema = useFieldSchema();
  const { name } = useCollection_deprecated();
  const getAriaLabel = useCallback(
    (postfix?: string) => {
      if (!fieldSchema) return '';
      const initializer = fieldSchema['x-initializer'] ? `-${fieldSchema['x-initializer']}` : '';
      const collectionName = name ? `-${name}` : '';
      postfix = postfix ? `-${postfix}` : '';

      return `schema-initializer-${fieldSchema['x-component']}${initializer}${collectionName}${postfix}`;
    },
    [fieldSchema, name],
  );

  return { getAriaLabel };
};
