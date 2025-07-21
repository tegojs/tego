import { useMemo } from 'react';
import { dayjs } from '@tachybase/utils/client';

import { useCurrentUserVariable, useDatetimeVariable, useExactDateVariable } from '../../schema-settings';
import { useCurrentRoleVariable } from '../../schema-settings/VariableInput/hooks/useRoleVariable';
import { VariableOption } from '../types';

const useBuiltInVariables = () => {
  const { currentUserCtx } = useCurrentUserVariable();
  const { currentRoleCtx } = useCurrentRoleVariable();
  const { datetimeCtx } = useDatetimeVariable();
  const { exactDateTimeCtx } = useExactDateVariable();
  const builtinVariables: VariableOption[] = useMemo(() => {
    return [
      {
        name: '$user',
        ctx: currentUserCtx,
        collectionName: 'users',
      },
      {
        name: '$nRole',
        ctx: currentRoleCtx,
        collectionName: 'roles',
      },
      /**
       * @deprecated
       * 兼容老版本
       */
      {
        name: 'currentUser',
        ctx: currentUserCtx,
        collectionName: 'users',
      },
      {
        name: '$nDate',
        ctx: datetimeCtx,
      },
      /**
       * @deprecated
       * 兼容旧版本的 `$date` 变量，新版本已弃用
       */
      {
        name: '$date',
        ctx: datetimeCtx,
      },
      {
        name: '$nExactDate',
        ctx: exactDateTimeCtx,
      },
      /**
       * @deprecated
       * 兼容旧版本的 `$system` 变量，新版本已弃用
       */
      {
        name: '$system',
        ctx: {
          now: () => dayjs().toISOString(),
        },
      },
      /**
       * @deprecated
       * 旧版本的一个变量，新版用 `$nDate` 代替
       */
      {
        name: 'currentTime',
        ctx: () => dayjs().toISOString(),
      },
    ];
  }, [currentUserCtx, exactDateTimeCtx]);

  return { builtinVariables };
};

export default useBuiltInVariables;
