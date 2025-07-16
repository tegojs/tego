import { i18nText } from '../../locale';

export const collectionMultiApp = {
  name: 'applications',
  filterTargetKey: 'name',
  targetKey: 'name',
  fields: [
    {
      type: 'uid',
      name: 'name',
      primaryKey: true,
      prefix: 'a',
      interface: 'input',
      uiSchema: {
        type: 'string',
        title: i18nText('App ID'),
        required: true,
        'x-component': 'Input',
        'x-validator': 'uid',
      },
    },
    {
      type: 'string',
      name: 'displayName',
      interface: 'input',
      uiSchema: {
        type: 'string',
        title: i18nText('App display name'),
        required: true,
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'pinned',
      interface: 'checkbox',
      uiSchema: {
        type: 'boolean',
        'x-content': i18nText('Pin to menu'),
        'x-component': 'Checkbox',
      },
    },
    {
      type: 'string',
      name: 'status',
      interface: 'radioGroup',
      defaultValue: 'pending',
      uiSchema: {
        type: 'string',
        title: i18nText('App status'),
        enum: [
          { label: i18nText('Initializing'), value: 'initializing' },
          { label: i18nText('Initialized'), value: 'initialized' },
          { label: i18nText('Running'), value: 'running' },
          { label: i18nText('Commanding'), value: 'commanding' },
          { label: i18nText('Stopped'), value: 'stopped' },
          { label: i18nText('Error'), value: 'error' },
          { label: i18nText('Not found'), value: 'not_found' },
        ],
        'x-component': 'Radio.Group',
      },
    },
    {
      type: 'string',
      name: 'isTemplate',
      interface: 'checkbox',
      uiSchema: {
        type: 'boolean',
        'x-content': i18nText('Is template'),
        'x-component': 'Checkbox',
      },
    },
    {
      interface: 'm2m',
      type: 'belongsToMany',
      name: 'partners',
      target: 'users',
      through: 'applicationsPartners',
      foreignKey: 'applicationName',
      otherKey: 'userId',
      collectionName: 'applications',
      targetKey: 'id',
      sourceKey: 'name',
      uiSchema: {
        type: 'array',
        title: i18nText('Collaborator'),
        'x-component': 'AssociationField',
        'x-component-props': {
          service: {
            params: {
              fields: ['id', 'username', 'nickname'],
            },
          },
          multiple: true,
          fieldNames: {
            label: 'username',
            value: 'id',
          },
        },
      },
    },
  ],
};
