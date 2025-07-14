import { ISchema } from '@tachybase/schema';

import { defaultProps, operators } from '../';
import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';

export class CheckboxFieldInterface extends CollectionFieldInterface {
  name = 'checkbox';
  type = 'object';
  group = 'choices';
  icon = 'checkboxField';
  order = 1;
  title = '{{t("Checkbox")}}';
  default = {
    type: 'boolean',
    uiSchema: {
      type: 'boolean',
      'x-component': 'Checkbox',
    },
  };
  availableTypes = ['boolean', 'integer', 'bigInt'];
  hasDefaultValue = true;
  properties = {
    ...defaultProps,
    'uiSchema.x-component-props.showUnchecked': {
      type: 'boolean',
      title: '{{t("Display X when unchecked")}}',
      default: false,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
    },
  };
  filterable = {
    operators: operators.boolean,
  };
  schemaInitialize(schema: ISchema, { block }: { block: string }): void {
    if (['Table', 'Kanban'].includes(block)) {
      schema['x-component-props'] = schema['x-component-props'] || {};
      schema['x-component-props']['ellipsis'] = true;
    }
  }
}
