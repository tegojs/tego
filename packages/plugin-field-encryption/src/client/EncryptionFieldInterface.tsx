import { CollectionFieldInterface, defaultProps } from '@tachybase/client';
import { uid } from '@tachybase/utils/client';

import { tval } from './locale';

export class EncryptionFieldInterface extends CollectionFieldInterface {
  name = 'encryption';
  type = 'object';
  group = 'advanced';
  icon = 'LockOutlined';
  order = 10;
  title = tval('Encryption');

  default = {
    type: 'encryption',
    iv: uid(16),
    uiSchema: {
      type: 'string',
      'x-component': 'Input',
    },
  };

  availableTypes = ['string'];
  hasDefaultValue = true;

  properties = {
    ...defaultProps,
  };

  filterable = {
    operators: [
      { label: '{{t("is")}}', value: '$encryptionEq', selected: true },
      { label: '{{t("is not")}}', value: '$encryptionNe' },
      { label: '{{t("exists")}}', value: '$exists', noValue: true },
      { label: '{{t("not exists")}}', value: '$notExists', noValue: true },
    ],
  };
}
