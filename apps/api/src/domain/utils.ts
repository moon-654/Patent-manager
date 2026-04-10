import { randomUUID } from 'crypto';

import type { PolicyVersion, SubmissionInventorShare } from './models';

export const createId = () => randomUUID();
export const now = () => new Date().toISOString();

export function addMonths(date: string | Date, months: number) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value.toISOString();
}

export function addYears(date: string | Date, years: number) {
  const value = new Date(date);
  value.setFullYear(value.getFullYear() + years);
  return value.toISOString();
}

export function sumShares(shares: SubmissionInventorShare[]) {
  return shares.reduce((total, share) => total + Number(share.shareRatio), 0);
}

export function assertSharesTotal(shares: SubmissionInventorShare[]) {
  const total = sumShares(shares);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(
      `공동 발명자 지분율 합계는 100이어야 합니다. 현재 ${total}입니다.`,
    );
  }
}

export function resolveGrade(policy: PolicyVersion, totalScore: number) {
  return (
    policy.grades.find(
      (grade) => totalScore >= grade.minScore && totalScore <= grade.maxScore,
    ) ?? policy.grades[policy.grades.length - 1]
  );
}

export function roundAmount(
  value: number,
  rule: 'FLOOR' | 'ROUND' | 'CEIL' = 'ROUND',
) {
  if (rule === 'FLOOR') {
    return Math.floor(value);
  }

  if (rule === 'CEIL') {
    return Math.ceil(value);
  }

  return Math.round(value);
}
