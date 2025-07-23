import { FormLayout } from '@tachybase/components';

import { useTranslation } from 'react-i18next';

import { SchemaComponent, SchemaComponentOptions } from '../../../core';

export const AddTabForm = (props) => {
  const { options } = props;
  const { t } = useTranslation();

  return (
    <SchemaComponentOptions scope={options.scope} components={{ ...options.components }}>
      <FormLayout layout={'vertical'}>
        <SchemaComponent
          schema={{
            properties: {
              title: {
                title: t('Tab name'),
                'x-component': 'Input',
                'x-decorator': 'FormItem',
                required: true,
              },
              icon: {
                title: t('Icon'),
                'x-component': 'IconPicker',
                'x-decorator': 'FormItem',
              },
            },
          }}
        />
      </FormLayout>
    </SchemaComponentOptions>
  );
};
