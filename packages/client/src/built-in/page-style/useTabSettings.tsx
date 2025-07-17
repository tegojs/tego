import React, { useCallback } from 'react';
import { error } from '@tachybase/utils/client';

import { useTranslation } from 'react-i18next';

import { useAPIClient } from '../../api-client';
import { SelectWithTitle } from '../../common';
import { useCurrentUserContext } from '../../user';

export const useTabSettings = () => {
  return {
    key: 'tab',
    eventKey: 'tab',
    label: <Label />,
  };
};

export function Label() {
  const { t } = useTranslation();
  const { updateUserPageStyle } = useUpdatePageStyleSettings();
  const currentUser = useCurrentUserContext();

  return (
    <SelectWithTitle
      title={t('Page style')}
      defaultValue={currentUser.data.data.systemSettings?.pageStyle || 'classical'}
      options={[
        {
          label: t('classical'),
          value: 'classical',
        },
        {
          label: t('tabs'),
          value: 'tab',
        },
      ]}
      onChange={updateUserPageStyle}
    />
  );
}

export function useUpdatePageStyleSettings() {
  const api = useAPIClient();
  const currentUser = useCurrentUserContext();

  const updateUserPageStyle = useCallback(
    async (pageStyle: string | null) => {
      if (pageStyle === currentUser.data.data.systemSettings?.pageStyle) {
        return;
      }
      try {
        await api.resource('users').updateProfile({
          values: {
            systemSettings: {
              ...(currentUser.data.data.systemSettings || {}),
              pageStyle,
            },
          },
        });
        currentUser.mutate({
          data: {
            ...currentUser.data.data,
            systemSettings: {
              ...(currentUser.data.data.systemSettings || {}),
              pageStyle,
            },
          },
        });
      } catch (err) {
        error(err);
      }
    },
    [api, currentUser],
  );

  return { updateUserPageStyle };
}
