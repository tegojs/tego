import { ISchema } from '@tachybase/schema';

import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';
import { defaultProps, operators } from './properties';

export class UrlFieldInterface extends CollectionFieldInterface {
  name = 'url';
  type = 'string';
  icon = 'GlobalOutlined';
  group = 'basic';
  order = 5;
  title = '{{t("URL")}}';
  default = {
    type: 'text',
    uiSchema: {
      type: 'string',
      'x-component': 'Input.URL',
    },
  };
  componentOptions = [
    {
      label: 'URL',
      value: 'Input.URL',
    },
    {
      label: 'Preview',
      value: 'Input.Preview',
    },
  ];
  availableTypes = ['string', 'text'];
  schemaInitialize(schema: ISchema, { block }) {}
  properties = {
    ...defaultProps,
  };
  titleUsable = true;
  filterable = {
    operators: operators.string,
  };
}
