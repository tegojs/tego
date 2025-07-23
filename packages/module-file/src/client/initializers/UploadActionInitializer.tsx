import { ActionInitializer, OpenMode, useCollection_deprecated } from '@tachybase/client';

export const UploadActionInitializer = (props) => {
  const collection = useCollection_deprecated();

  const schema = {
    type: 'void',
    'x-action': 'create',
    title: "{{t('Upload')}}",
    'x-designer': 'Action.Designer',
    'x-component': 'Action',
    'x-decorator': 'ACLActionProvider',
    'x-component-props': {
      openMode: OpenMode.DRAWER_MODE,
      type: 'primary',
      icon: 'UploadOutlined',
    },
    properties: {
      drawer: {
        type: 'void',
        title: '{{ t("Upload files") }}',
        'x-component': 'Action.Container',
        properties: {
          upload: {
            type: 'void',
            title: '{{ t("Upload files") }}',
            'x-component': 'Upload.DraggerV2',
            'x-use-component-props': 'useUploadFiles',
            'x-component-props': {
              height: '50vh',
              // action: `${collection.name}:create`,
              multiple: true,
              listType: 'picture',
            },
          },
        },
      },
    },
  };
  return <ActionInitializer {...props} schema={schema} />;
};
