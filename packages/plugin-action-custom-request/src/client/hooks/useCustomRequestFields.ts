import { useCollection, useCompile, useFormulaTitleOptions } from '@tachybase/client';
import { useFieldSchema } from '@tachybase/schema';

export const useCustomRequestFields = () => (field) => {
  field.loading = true;
  const collection = useCollection();
  const compile = useCompile();
  const filterType = ['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'];
  field.dataSource = collection.fields
    .map((item) => {
      if (filterType.includes(item.name)) return;
      return { label: compile(item.uiSchema.title), value: item.name };
    })
    .filter(Boolean);
  field.loading = false;
};
