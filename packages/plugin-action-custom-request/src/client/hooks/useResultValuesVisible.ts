import { useActionContext } from '@tachybase/client';

export const useResultValuesVisible = () => {
  const { fieldSchema } = useActionContext();
  return fieldSchema['x-action'] === 'customize:form:request';
};
