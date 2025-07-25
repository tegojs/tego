import { useMemo } from 'react';
import { useCollection_deprecated, useCollectionFilterOptions, useCompile, useGlobalVariable } from '@tachybase/client';

import { useTranslation } from '../locale';

export const useCustomRequestVariableOptions = () => {
  const collection = useCollection_deprecated();
  const { t } = useTranslation();
  const fieldsOptions = useCollectionFilterOptions(collection);
  const userFieldOptions = useCollectionFilterOptions('users');
  const compile = useCompile();

  const [fields, userFields] = useMemo(() => {
    return [compile(fieldsOptions), compile(userFieldOptions)];
  }, [fieldsOptions, userFieldOptions]);
  const environmentVariables = useGlobalVariable('$env');
  return useMemo(() => {
    // 如果environmentVariables为空则返回不包含environmentVariables的数组,如果不为空则返回包含environmentVariables的数组
    const list = [
      {
        name: 'currentRecord',
        title: t('Current record', { ns: 'core' }),
        children: [...fields],
      },
      {
        name: 'currentUser',
        title: t('Current user', { ns: 'core' }),
        children: userFields,
      },
      {
        name: 'currentTime',
        title: t('Current time', { ns: 'core' }),
        children: null,
      },
    ];
    if (environmentVariables) {
      list.unshift(environmentVariables);
    }
    return list;
  }, [fields, userFields]);
};

export const useCustomRequestVariableRecordOptions = () => {
  const collection = useCollection_deprecated();
  const { t } = useTranslation();
  const fieldsOptions = useCollectionFilterOptions(collection);
  const userFieldOptions = useCollectionFilterOptions('users');
  const compile = useCompile();

  const [fields, userFields] = useMemo(() => {
    return [compile(fieldsOptions), compile(userFieldOptions)];
  }, [fieldsOptions, userFieldOptions]);
  const environmentVariables = useGlobalVariable('$env');
  return useMemo(() => {
    // 如果environmentVariables为空则返回不包含environmentVariables的数组,如果不为空则返回包含environmentVariables的数组
    const list = [...fields];
    if (environmentVariables) {
      list.unshift(environmentVariables);
    }
    return list;
  }, [fields, userFields]);
};
