import { SchemaInitializerItemType } from '@tachybase/client';

import { featureNameLowerCase_formDesign } from '../constants';
import { tval } from '../locale';

export const formDesignInitializerItem: SchemaInitializerItemType = {
  type: 'item',
  name: featureNameLowerCase_formDesign,
  title: tval('Form design'),
  icon: 'FormOutlined',
  Component: 'FormDesignBlockInitItem',
};
