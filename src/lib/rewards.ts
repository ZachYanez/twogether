import type { RewardMilestone } from '@/src/lib/twogether-types';

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    id: 'sessions-1',
    threshold: 1,
    name: 'First Session',
    body: 'A bright first star for completing your first protected moment together.',
  },
  {
    id: 'sessions-10',
    threshold: 10,
    name: '10 Sessions',
    body: 'Ten completed sessions in. Your rhythm together is starting to show.',
  },
  {
    id: 'sessions-25',
    threshold: 25,
    name: '25 Sessions',
    body: 'Twenty-five sessions completed. This habit is becoming part of your relationship.',
  },
  {
    id: 'sessions-50',
    threshold: 50,
    name: '50 Sessions',
    body: 'Fifty sessions together is a serious milestone worth celebrating.',
  },
  {
    id: 'sessions-75',
    threshold: 75,
    name: '75 Sessions',
    body: 'Seventy-five sessions in. You are building something real together.',
  },
  {
    id: 'sessions-100',
    threshold: 100,
    name: 'Lovebird',
    body: 'One hundred completed sessions. You unlocked the Lovebird award.',
  },
];

export function getRewardMilestoneForTotal(totalCompleted: number) {
  return REWARD_MILESTONES.find((milestone) => milestone.threshold === totalCompleted) ?? null;
}
