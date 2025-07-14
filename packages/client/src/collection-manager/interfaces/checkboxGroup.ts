import { ISchema } from '@tachybase/schema';

import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';
import { dataSource, defaultProps, operators } from './properties';

export class CheckboxGroupFieldInterface extends CollectionFieldInterface {
  name = 'checkboxGroup';
  type = 'object';
  icon = 'UnorderedListOutlined';
  group = 'choices';
  order = 5;
  title = '{{t("Checkbox group")}}';
  default = {
    interface: 'checkboxGroup',
    type: 'array',
    defaultValue: [],
    uiSchema: {
      type: 'string',
      'x-component': 'Checkbox.Group',
    },
  };
  availableTypes = ['array'];
  hasDefaultValue = true;
  properties = {
    ...defaultProps,
    'uiSchema.enum': dataSource,
  };
  filterable = {
    operators: operators.array,
  };

  schemaInitialize(schema: ISchema, { block }: { block: string }): void {
    if (['Table', 'Kanban'].includes(block)) {
      schema['x-component-props'] = schema['x-component-props'] || {};
      schema['x-component-props']['ellipsis'] = true;
    }
  }
}
