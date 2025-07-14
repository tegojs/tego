import { ISchema } from '@tachybase/schema';

import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';
import { dataSource, defaultProps, operators } from './properties';

export class SelectFieldInterface extends CollectionFieldInterface {
  name = 'select';
  type = 'object';
  icon = 'selectField';
  group = 'choices';
  order = 2;
  title = '{{t("Single select")}}';
  sortable = true;
  default = {
    type: 'string',
    uiSchema: {
      type: 'string',
      'x-component': 'Select',
      enum: [],
    },
  };
  availableTypes = ['string', 'bigInt', 'boolean'];
  hasDefaultValue = true;
  properties = {
    ...defaultProps,
    'uiSchema.enum': dataSource,
  };
  filterable = {
    operators: operators.enumType,
  };
  titleUsable = true;
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
