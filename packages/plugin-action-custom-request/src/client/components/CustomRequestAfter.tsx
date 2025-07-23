import React, { useState } from 'react';
import {
  AfterSuccess,
  findSchema,
  OpenMode,
  SchemaSettingsModalItem,
  useActionContext,
  useDesignable,
  useTranslation,
} from '@tachybase/client';
import { ISchema, useFieldSchema } from '@tachybase/schema';

import { Checkbox, Form, Input, Space } from 'antd';

import { CustomResponseTemplate } from './CustomResponseTemplate';

const afterSuccessSchema: (t) => ISchema = (t) => {
  return {
    type: 'object',
    title: t('After successful submission'),
    properties: {
      down: {
        title: '{{t("Is DownLoad")}}',
        'x-decorator': 'FormItem',
        'x-component': 'Checkbox',
        'x-component-props': {},
      },
      downTitle: {
        title: '{{t("Setting Down Title")}}',
        default: '{{ filename }}',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {},
        'x-reactions': {
          dependencies: ['down'],
          fulfill: {
            state: {
              visible: '{{!!$deps[0]}}',
            },
          },
        },
      },
      successMessage: {
        title: '{{t("Popup message")}}',
        'x-decorator': 'FormItem',
        'x-component': CustomResponseTemplate,
        'x-component-props': {},
        // 'x-reactions': {
        //   dependencies: ['down'],
        //   fulfill: {
        //     state: {
        //       visible: '{{!$deps[0]}}',
        //     },
        //   },
        // },
      },
      popupClose: {
        title: '{{t("Popup close method")}}',
        enum: [
          { label: '{{t("Automatic close")}}', value: false },
          { label: '{{t("Manually close")}}', value: true },
        ],
        'x-decorator': 'FormItem',
        'x-component': 'Radio.Group',
        'x-component-props': {},
      },
      manualClose: {
        title: '{{t("Message clear metchod")}}',
        enum: [
          { label: '{{t("Automatic close")}}', value: false },
          { label: '{{t("Manually close")}}', value: true },
        ],
        'x-decorator': 'FormItem',
        'x-component': 'Radio.Group',
        'x-component-props': {},
      },
      redirecting: {
        title: '{{t("Then")}}',
        enum: [
          { label: '{{t("Stay on current page")}}', value: false },
          { label: '{{t("Redirect to")}}', value: true },
        ],
        'x-decorator': 'FormItem',
        'x-component': 'Radio.Group',
        'x-component-props': {},
        'x-reactions': {
          target: 'redirectTo',
          fulfill: {
            state: {
              visible: '{{!!$self.value}}',
            },
          },
        },
      },
      redirectTo: {
        title: '{{t("Link")}}',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {},
      },
    },
  };
};

export function CustomRequestAfter() {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const ctx = useActionContext();
  const openMode = findSchema(ctx.fieldSchema);
  const component = fieldSchema.parent.parent['x-component'];
  const schema = { ...(afterSuccessSchema(t) as any) };
  if (
    ((!openMode || openMode === OpenMode.PAGE) && (component as string).includes('Form')) ||
    !(component as string).includes('Form')
  ) {
    delete schema.properties.popupClose;
  }
  return (
    <SchemaSettingsModalItem
      title={t('After successful submission')}
      initialValues={fieldSchema?.['x-action-settings']?.['onSuccess']}
      schema={{ ...schema } as ISchema}
      onSubmit={(onSuccess) => {
        fieldSchema['x-action-settings']['onSuccess'] = onSuccess;
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': fieldSchema['x-action-settings'],
          },
        });
      }}
    />
  );
}
