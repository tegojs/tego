import { css, useCompile } from '@tachybase/client';

import { Progress, Tag } from 'antd';

import { APPROVAL_TODO_STATUS } from '../../../../common/constants/approval-todo-status';
import { approvalTodoStatusMap } from '../../../../common/constants/approval-todo-status-options';
import { jobStatusOptions } from '../../../../common/constants/job-status-options';
import { VoteCategoryEnums, voteOption } from './tools';

// 审批处理: 任务节点值
export function renderTaskNode(text, record, index) {
  return <ColumnTaskNode text={text} record={record} index={index} />;
}

const ColumnTaskNode = (props) => {
  const { text, record, index } = props;
  const isApprovalRow = index > 0;

  const isNeedShowTag = isApprovalRow && record?.groupCount > 1;

  return (
    <>
      <span key={'span'}>{text}</span>
      {isNeedShowTag ? <ApprovalTag record={record} /> : null}
    </>
  );
};

const ApprovalTag = (props) => {
  const compile = useCompile();
  const { record } = props;
  const { node, job, statusCount: statusCountMap, groupCount } = record;

  const { branchMode, negotiation } = node?.config || ({} as any);
  const tag = branchMode ? approvalTodoStatusMap[job?.result] : jobStatusOptions[job?.status];
  const enums = VoteCategoryEnums[voteOption(+negotiation)];

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        gap: 0.5em;
        .ant-tag {
          margin-right: 0;
        }
      `}
    >
      <Tag key={'tag'} color={tag == null ? undefined : tag.color}>
        {typeof enums.label == 'function' ? enums.label(negotiation) : compile(enums.label)}
      </Tag>
      {statusCountMap !== null ? <ProcessTag groupCount={groupCount} statusCount={statusCountMap} /> : null}
    </div>
  );
};

const ProcessTag = (props) => {
  const { groupCount, statusCount } = props;
  return (
    <Progress
      type="circle"
      size={20}
      strokeColor="#389e0d"
      showInfo={false}
      percent={
        ((statusCount[APPROVAL_TODO_STATUS.APPROVED] + statusCount[APPROVAL_TODO_STATUS.REJECTED]) / groupCount) * 100
      }
      success={{
        percent: (statusCount[APPROVAL_TODO_STATUS.REJECTED] / groupCount) * 100,
        strokeColor: '#cf1322',
      }}
    />
  );
};
