import { useApp } from '../application';

export const useAdminSchemaUid = () => {
  const app = useApp();
  return app.indexSchema;
};
