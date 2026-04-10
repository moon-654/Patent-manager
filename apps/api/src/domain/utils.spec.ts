import { seedData } from './seed-data';
import { assertSharesTotal, resolveGrade, roundAmount } from './utils';

describe('domain utils', () => {
  it('validates inventor share totals', () => {
    expect(() =>
      assertSharesTotal(seedData.submissions[0].shares),
    ).not.toThrow();
    expect(() =>
      assertSharesTotal([
        { id: '1', inventorName: 'A', shareRatio: 60, isPrimary: true },
        { id: '2', inventorName: 'B', shareRatio: 20, isPrimary: false },
      ]),
    ).toThrow();
  });

  it('resolves a grade from active policy ranges', () => {
    const grade = resolveGrade(seedData.policies[0], 82);
    expect(grade.gradeCode).toBe('G2');
  });

  it('rounds amounts using rule variants', () => {
    expect(roundAmount(12.1, 'FLOOR')).toBe(12);
    expect(roundAmount(12.1, 'CEIL')).toBe(13);
    expect(roundAmount(12.5, 'ROUND')).toBe(13);
  });
});
