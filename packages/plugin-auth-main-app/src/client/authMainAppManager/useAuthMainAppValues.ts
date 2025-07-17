import { useAPIClient, useRequest } from '@tachybase/client';
import { createForm } from '@tachybase/schema';

import { COLLECTION_AUTH_MAIN_APP_CONFIG } from '../../constants';

export const useAuthMainAppValues = () => {
  const api = useAPIClient();
  const { data } = useRequest(() =>
    api
      .resource(COLLECTION_AUTH_MAIN_APP_CONFIG)
      .get()
      .then((res) => res.data?.data),
  );
  const form = createForm({
    values: data,
  });
  return { form };
};
