import { NAMESPACE, tval } from '../../locale';
import { approvalStatusEnums } from '../constants/approval-initiation-status-options';

export const collectionApprovals = {
  title: `{{t("Approval applications", { ns: "${NAMESPACE}" })}}`,
  name: 'approvals',
  fields: [
    {
      type: 'bigInt',
      name: 'id',
      interface: 'number',
      uiSchema: {
        type: 'number',
        title: 'ID',
        'x-component': 'InputNumber',
      },
    },
    {
      type: 'belongsTo',
      name: 'workflow',
      target: 'workflows',
      foreignKey: 'workflowId',
      interface: 'm2o',
      uiSchema: {
        type: 'number',
        title: '{{t("Workflow", { ns: "workflow" })}}',
        'x-component': 'RemoteSelect',
        'x-component-props': { fieldNames: { label: 'title', value: 'id' }, service: { resource: 'workflows' } },
      },
    },
    {
      type: 'belongsTo',
      name: 'createdBy',
      target: 'users',
      foreignKey: 'createdById',
      interface: 'm2o',
      uiSchema: {
        type: 'number',
        title: `{{t("Initiator", { ns: "${NAMESPACE}" })}}`,
        'x-component': 'RemoteSelect',
        'x-component-props': {
          fieldNames: {
            label: 'nickname',
            value: 'id',
          },
          service: {
            resource: 'users',
          },
        },
      },
    },
    {
      type: 'integer',
      name: 'status',
      interface: 'select',
      uiSchema: {
        type: 'number',
        title: '{{t("Status", { ns: "workflow" })}}',
        'x-component': 'Select',
        enum: approvalStatusEnums,
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      interface: 'createdAt',
      uiSchema: {
        type: 'datetime',
        title: tval('Launched time'),
        'x-component': 'DatePicker',
        'x-component-props': { showTime: true },
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      interface: 'updatedAt',
      uiSchema: {
        type: 'datetime',
        title: tval('Launched time'),
        'x-component': 'DatePicker',
        'x-component-props': { showTime: true },
      },
    },
    {
      type: 'jsonb',
      name: 'summary',
      uiSchema: {
        type: 'array',
        title: tval('Summary'),
        'x-component': 'ApprovalsSummary',
        'x-component-props': {
          style: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
      },
    },
  ],
};
