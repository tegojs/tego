import { useCallback } from 'react';
import { error } from '@tachybase/utils/client';

import { useTranslation } from 'react-i18next';

import { useAPIClient } from '../../api-client';
import { SelectWithTitle } from '../../common';
import { useCurrentUserContext } from '../../user';
import { PageStyle } from './PageStyle.provider';

export const useTabSettings = () => {
  return {
    key: PageStyle.TAB_STYLE,
    eventKey: PageStyle.TAB_STYLE,
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
      defaultValue={currentUser.data.data.systemSettings?.pageStyle || PageStyle.CLASSICAL}
      options={[
        {
          label: t('classical'),
          value: PageStyle.CLASSICAL,
        },
        {
          label: t('tabs'),
          value: PageStyle.TAB_STYLE,
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
    async (pageStyle: PageStyle | null) => {
      if (pageStyle === currentUser.data.data.systemSettings?.pageStyle) {
        return;
      }
      try {
        await api.resource('users').updateProfile({
          values: {
            systemSettings: {
              ...currentUser.data.data.systemSettings,
              pageStyle,
            },
          },
        });
        currentUser.mutate({
          data: {
            ...currentUser.data.data,
            systemSettings: {
              ...currentUser.data.data.systemSettings,
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
