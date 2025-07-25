import { useCallback, useMemo } from 'react';
import {
  SchemaInitializerItemType,
  useAPIClient,
  useCollectionManager_deprecated,
  useCompile,
  useSchemaInitializer,
} from '@tachybase/client';
import { uid } from '@tachybase/utils/client';

import { cloneDeep } from 'lodash';

import { systemFields } from '../constants/systemFields';
import { useContextFormDesign } from '../contexts/FormDesign';

export function useFormDesignItems(): SchemaInitializerItemType[] {
  const { getTemplate, templates: collectionTemplates, refreshCM } = useCollectionManager_deprecated();
  const compile = useCompile();
  const api = useAPIClient();
  const { insert, setVisible } = useSchemaInitializer();
  const { setVisible: setVisibleFormDesign } = useContextFormDesign();

  const handleClick = useCallback(async () => {
    setVisibleFormDesign(true);
  }, []);

  const collectionItems = useMemo(() => {
    const skipNames = new Set(['sql', 'view', 'import', 'importXlsx']);
    return collectionTemplates
      .filter((item) => !skipNames.has(item.name) && !item.divider)
      .map((item) => {
        return {
          type: 'item',
          name: item.name,
          label: compile(item.title),
          key: item.name,
          onClick: async (info) => {
            const schema = getTemplate(info.key);
            const initialValue: any = {
              name: `t_${uid()}`,
              title: "{{t('Untitle collection')}}",
              template: schema.name,
              autoGenId: true,
              createdAt: true,
              createdBy: true,
              updatedAt: true,
              updatedBy: true,
              view: false,
              ...(() => {
                const defaultValue = cloneDeep(schema.default) || {};
                const existingFields = Array.isArray(defaultValue.fields) ? defaultValue.fields : [];
                return {
                  ...defaultValue,
                  fields: [...existingFields, ...systemFields],
                };
              })(),
            };
            await api.resource('collections').create({
              values: {
                logging: true,
                ...initialValue,
              },
            });
            setVisible(false);
            await refreshCM();
            handleClick();
          },
        };
      });
  }, [collectionTemplates]);

  return collectionItems;
}
