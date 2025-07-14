import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';
import { defaultProps, operators, unique } from './properties';

export class PhoneFieldInterface extends CollectionFieldInterface {
  name = 'phone';
  icon = 'phoneField';
  type = 'object';
  group = 'basic';
  order = 3;
  title = '{{t("Phone")}}';
  sortable = true;
  default = {
    type: 'string',
    uiSchema: {
      type: 'string',
      'x-component': 'Input',
      'x-component-props': {
        type: 'tel',
      },
      // 'x-validator': 'phone',
    },
  };
  availableTypes = ['string'];
  hasDefaultValue = true;
  properties = {
    ...defaultProps,
    unique,
  };
  filterable = {
    operators: operators.string,
  };
  titleUsable = true;
}
