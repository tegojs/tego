import { Field, useField, useFieldSchema } from '@tachybase/schema';

import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { SchemaSettings } from '../../../../application/schema-settings/SchemaSettings';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useCollectionField, useDataSourceManager } from '../../../../data-source';
import { useCompile, useDesignable, useFieldModeOptions, useIsAddNewForm } from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import {
  useIsAssociationField,
  useIsFieldReadPretty,
  useIsMuiltipleAble,
  useIsSelectFieldMode,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { useIsShowMultipleSwitch } from '../../../../schema-settings/hooks/useIsShowMultipleSwitch';
import {
  allowMultiple,
  CustomTitle,
  enableLink,
  quickCreate,
  setDefaultSortingRules,
  setTheDataScope,
} from '../Select/selectComponentFieldSettings';

export const CustomTitleComponentFieldSettings = new SchemaSettings({
  name: 'fieldSettings:component:CustomTitle',
  items: [
    {
      name: 'fieldComponent',
      type: 'select',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const collectionFieldCurrent = useCollectionField();

        const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();

        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;

        const fieldModeOptions = useFieldModeOptions({ fieldSchema: tableColumnSchema, collectionField });

        const isAddNewForm = useIsAddNewForm();
        const fieldMode = useFieldComponentName();
        const { dn } = useDesignable();

        const isSelect = ['select', 'multipleSelect'].includes(collectionFieldCurrent?.interface);

        const optionsMuiltipleSelect = [
          { label: t('Select'), value: 'Select' },
          { label: t('Radio group'), value: 'Radio group' },
          { label: t('Custom Title'), value: 'CustomTitle' },
        ];

        if (collectionFieldCurrent?.interface === 'multipleSelect') {
          const index = optionsMuiltipleSelect.findIndex((item) => {
            if (item.value === 'Select') {
              item.value = 'multiple';
            }
            return item.value === 'Radio group';
          });
          optionsMuiltipleSelect.splice(index, 1);
        }
        const dm = useDataSourceManager();
        const collectionInterface = dm.collectionFieldInterfaceManager.getFieldInterface(collectionField?.interface);
        const compile = useCompile();

        const componentOptions = isSelect ? optionsMuiltipleSelect : fieldModeOptions;
        collectionInterface?.componentOptions
          ?.filter((item) => !item.useVisible || item.useVisible())
          ?.forEach((item) => {
            if (!componentOptions?.find((modeItem) => modeItem.value === item.value)) {
              componentOptions?.push({
                label: compile(item.label),
                value: item.value,
              });
            }
          });
        return {
          title: t('Field component'),
          options: componentOptions,
          value: fieldMode,
          onChange(mode) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['mode'] = mode;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            field.componentProps = field.componentProps || {};
            field.componentProps.mode = mode;

            // 子表单状态不允许设置默认值
            if (isSubMode(fieldSchema) && isAddNewForm) {
              // @ts-ignore
              schema.default = null;
              fieldSchema.default = null;
              field?.setInitialValue?.(null);
              field?.setValue?.(null);
            }

            void dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
      useVisible() {
        const fieldMode = useFieldComponentName();
        return fieldMode === 'CustomTitle';
      },
    },
    {
      ...CustomTitle,
      useVisible() {
        const fieldMode = useFieldComponentName();
        return fieldMode === 'CustomTitle';
      },
    },
    {
      ...setTheDataScope,
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFieldReadPretty = useIsFieldReadPretty();
        return isSelectFieldMode && !isFieldReadPretty;
      },
    },
    {
      ...setDefaultSortingRules,
      useComponentProps() {
        const { fieldSchema } = useColumnSchema();
        return {
          fieldSchema,
        };
      },
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFieldReadPretty = useIsFieldReadPretty();
        return isSelectFieldMode && !isFieldReadPretty;
      },
    },
    {
      ...quickCreate,
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const readPretty = useIsFieldReadPretty();
        const { fieldSchema } = useColumnSchema();
        return isAssociationField && !fieldSchema && !readPretty;
      },
    },
    {
      ...allowMultiple,
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const IsShowMultipleSwitch = useIsShowMultipleSwitch();
        return isAssociationField && IsShowMultipleSwitch();
      },
    },
    {
      ...enableLink,
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return useIsAssociationField() && readPretty;
      },
    },
  ],
});
