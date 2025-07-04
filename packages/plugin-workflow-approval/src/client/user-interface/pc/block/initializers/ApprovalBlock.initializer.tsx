import { COLLECTION_NAME_APPROVAL_CARBON_COPY } from '../../../../../common/constants';
import { tval } from '../../../../locale';

export const initializerName = 'otherBlocks.workflow.approval';

export const initializerApprovalBlock = {
  type: 'itemGroup',
  key: 'approvalBlock',
  name: 'approvalBlock',
  title: tval('Approval'),
  icon: 'AuditOutlined',
  children: [
    {
      type: 'item',
      title: tval('Initiate Request'),
      icon: 'ClockCircleOutlined',
      'x-component': 'Approval-InitiateApplication',
      Component: 'Approval-ViewBlockInitItem',
      collection: 'workflows',
      action: 'list',
      useInsert: () => {
        return (schema) => {};
      },
    },
    {
      type: 'item',
      title: tval('New Initiate Request'),
      icon: 'ClockCircleOutlined',
      'x-component': 'Approval-FeatureList',
      Component: 'Approval-ViewBlockInitItem',
      collection: 'workflows',
      action: 'listApprovalFlows',
      useInsert: () => {
        return (schema) => {};
      },
    },
    {
      type: 'item',
      title: tval('My Initiations'),
      icon: 'AuditOutlined',
      'x-component': 'Approval-ViewTableInitiated',
      Component: 'Approval-ViewBlockInitItem',
      collection: 'approvals',
      params: {
        appends: [
          'createdBy.nickname',
          'workflow.title',
          'workflow.enabled',
          'records.id',
          'records.status',
          'records.node.title',
        ],
        except: ['data'],
      },
    },
    {
      type: 'item',
      title: tval('My Pending Tasks'),
      icon: 'FormOutlined',
      'x-component': 'Approval-ViewTableTodos',
      Component: 'Approval-ViewBlockInitItem',
      collection: 'approvalRecords',
      params: {
        appends: [
          'createdBy.id',
          'createdBy.nickname',
          'user.id',
          'user.nickname',
          'node.id',
          'node.title',
          'job.id',
          'job.status',
          'job.result',
          'workflow.id',
          'workflow.title',
          'workflow.enabled',
          'execution.id',
          'execution.status',
        ],
      },
    },
    {
      type: 'item',
      title: tval('Carbon Copy me'),
      icon: 'MailOutlined',
      'x-decorator': 'CarbonCopyBlockProvider',
      'x-component': 'CarbonCopyCenter',
      'x-toolbar': 'BlockSchemaToolbar',
      'x-settings': 'blockSettings:table',
      Component: 'Approval-ViewBlockInitItem',
      collection: COLLECTION_NAME_APPROVAL_CARBON_COPY,
      params: {
        appends: [
          'createdBy.id',
          'createdBy.nickname',
          'approval.status',
          'user.id',
          'user.nickname',
          'node.id',
          'node.title',
          'job.id',
          'job.status',
          'job.result',
          'workflow.id',
          'workflow.title',
          'workflow.enabled',
          'execution.id',
          'execution.status',
        ],
      },
    },
  ],
};
