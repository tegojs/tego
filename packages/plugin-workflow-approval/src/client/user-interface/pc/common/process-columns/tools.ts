import { lang, NAMESPACE } from '../../../../locale';

const VoteCategory = {
  SINGLE: Symbol('single'),
  ALL: Symbol('all'),
  VOTE: Symbol('vote'),
};
export const VoteCategoryEnums = [
  {
    value: VoteCategory.SINGLE,
    label: `{{t("Or", { ns: "${NAMESPACE}" })}}`,
  },
  {
    value: VoteCategory.ALL,
    label: `{{t("And", { ns: "${NAMESPACE}" })}}`,
  },
  {
    value: VoteCategory.VOTE,
    label: (v: number) => `${lang('Voting')} ( > ${(v * 100).toFixed(0)}%)`,
  },
].reduce((obj, vote) => Object.assign(obj, { [vote.value]: vote }), {});
export function voteOption(value: number) {
  switch (true) {
    // 会签, 需要全部通过
    case value === 1:
      return VoteCategory.ALL;
    // 投票, 需要通过一定比例
    case 0 < value && value < 1:
      return VoteCategory.VOTE;
    // 或签, 只需通过一人
    default:
      return VoteCategory.SINGLE;
  }
}
