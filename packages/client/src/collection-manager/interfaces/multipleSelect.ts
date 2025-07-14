import { ISchema } from '@tachybase/schema';

import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';
import { dataSource, defaultProps, operators } from './properties';

export class MultipleSelectFieldInterface extends CollectionFieldInterface {
  name = 'multipleSelect';
  type = 'object';
  icon = 'multipleSelectField';
  group = 'choices';
  order = 3;
  title = '{{t("Multiple select")}}';
  default = {
    type: 'array',
    defaultValue: [],
    uiSchema: {
      type: 'array',
      'x-component': 'Select',
      'x-component-props': {
        mode: 'multiple',
      },
      enum: [],
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
  schemaInitialize(schema: ISchema, { block }) {
    const props = (schema['x-component-props'] = schema['x-component-props'] || {});
    props.style = {
      ...props.style,
      width: '100%',
    };

    if (['Table', 'Kanban'].includes(block)) {
      props['ellipsis'] = true;
    }
  }
}
