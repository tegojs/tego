export const systemFields = [
  {
    name: 'id',
    type: 'bigInt',
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    uiSchema: {
      type: 'number',
      title: '{{t("ID")}}',
      'x-component': 'InputNumber',
      'x-read-pretty': true,
    },
    interface: 'integer',
  },
  {
    name: 'createdAt',
    interface: 'createdAt',
    type: 'date',
    field: 'createdAt',
    uiSchema: {
      type: 'datetime',
      title: '{{t("Created at")}}',
      'x-component': 'DatePicker',
      'x-component-props': {},
      'x-read-pretty': true,
    },
  },
  {
    name: 'createdBy',
    interface: 'createdBy',
    type: 'belongsTo',
    target: 'users',
    foreignKey: 'createdById',
    uiSchema: {
      type: 'object',
      title: '{{t("Created by")}}',
      'x-component': 'AssociationField',
      'x-component-props': {
        fieldNames: {
          value: 'id',
          label: 'nickname',
        },
      },
      'x-read-pretty': true,
    },
  },
  {
    type: 'date',
    field: 'updatedAt',
    name: 'updatedAt',
    interface: 'updatedAt',
    uiSchema: {
      type: 'string',
      title: '{{t("Last updated at")}}',
      'x-component': 'DatePicker',
      'x-component-props': {},
      'x-read-pretty': true,
    },
  },
  {
    type: 'belongsTo',
    target: 'users',
    foreignKey: 'updatedById',
    name: 'updatedBy',
    interface: 'updatedBy',
    uiSchema: {
      type: 'object',
      title: '{{t("Last updated by")}}',
      'x-component': 'AssociationField',
      'x-component-props': {
        fieldNames: {
          value: 'id',
          label: 'nickname',
        },
      },
      'x-read-pretty': true,
    },
  },
];
