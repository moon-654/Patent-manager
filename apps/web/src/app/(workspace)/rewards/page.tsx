'use client';

import { useEffect, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { LifecycleStepper } from '@/components/lifecycle-stepper';
import { Panel } from '@/components/panel';
import { SplitDetailPane } from '@/components/split-detail-pane';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Timeline } from '@/components/timeline';
import { apiFetch } from '@/lib/api';
import type { RewardDetail, RewardSummary } from '@/lib/types';

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('ko-KR') : '-';
}

export default function RewardsPage() {
  const [rows, setRows] = useState<RewardSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RewardDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshAll(preferredId?: string) {
    const data = await apiFetch<RewardSummary[]>('/rewards');
    setRows(data);
    const nextId = preferredId ?? selectedId ?? data[0]?.id ?? null;
    setSelectedId(nextId);
    if (nextId) {
      setDetail(await apiFetch<RewardDetail>(`/rewards/${nextId}`));
    } else {
      setDetail(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const data = await apiFetch<RewardSummary[]>('/rewards');
        if (!active) {
          return;
        }

        setRows(data);
        const firstId = data[0]?.id ?? null;
        setSelectedId(firstId);
        if (firstId) {
          const firstDetail = await apiFetch<RewardDetail>(`/rewards/${firstId}`);
          if (active) {
            setDetail(firstDetail);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '보상 목록을 불러오지 못했습니다.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPage();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    let active = true;
    async function syncDetail() {
      const data = await apiFetch<RewardDetail>(`/rewards/${selectedId}`);
      if (active) {
        setDetail(data);
      }
    }

    void syncDetail();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const filteredRows = rows.filter((row) => {
    const matchesStatus = statusFilter === 'ALL' || row.currentStatus === statusFilter;
    const matchesKeyword =
      keyword.length === 0 ||
      row.rewardNo.toLowerCase().includes(keyword.toLowerCase()) ||
      row.ownerName.toLowerCase().includes(keyword.toLowerCase()) ||
      row.rewardType.toLowerCase().includes(keyword.toLowerCase());
    return matchesStatus && matchesKeyword;
  });

  const statuses = ['ALL', ...Array.from(new Set(rows.map((row) => row.currentStatus)))];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
          Reward Queue
        </p>
        <h1 className="font-display text-5xl text-[var(--color-paper)]">
          산정부터 지급까지 한눈에 보는 보상 큐
        </h1>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState title="보상 목록" /> : null}

      {!loading ? (
        <SplitDetailPane
          list={
            <Panel title="보상 처리 목록" eyebrow="Queue and Progress">
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px]">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="보상번호, 발명자, 유형 검색"
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-paper)] outline-none placeholder:text-[#8f7f6f]"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-paper)] outline-none"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL' ? '전체 상태' : status}
                    </option>
                  ))}
                </select>
              </div>

              {filteredRows.length === 0 ? (
                <EmptyState
                  title="보상 건이 없습니다"
                  description="현재 조건에 맞는 보상 항목이 없습니다."
                />
              ) : (
                <DataTable
                  rows={filteredRows}
                  rowKey={(row) => row.id}
                  selectedKey={selectedId ?? undefined}
                  onSelect={(row) => setSelectedId(row.id)}
                  columns={[
                    {
                      key: 'rewardNo',
                      header: '보상번호',
                      render: (row) => (
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-paper)]">
                            {row.rewardNo}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8f7f6f]">
                            {row.rewardType}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'target',
                      header: '대상/발명자',
                      render: (row) => (
                        <div>
                          <p className="text-sm text-[var(--color-paper)]">{row.ownerName}</p>
                          <p className="mt-1 text-xs text-[#c8bbad]">
                            {row.targetType} · {row.targetId}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: '상태',
                      render: (row) => <StatusBadge value={row.currentStatus} />,
                    },
                    {
                      key: 'amount',
                      header: '총액',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {row.totalAmount.toLocaleString()}원
                        </div>
                      ),
                    },
                    {
                      key: 'progress',
                      header: '지급 진행도',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {row.paymentProgress}
                        </div>
                      ),
                    },
                    {
                      key: 'nextAction',
                      header: '다음 액션',
                      render: (row) => (
                        <div className="text-sm text-[#f0d3ab]">{row.nextAction}</div>
                      ),
                    },
                  ]}
                />
              )}
            </Panel>
          }
          detail={
            detail ? (
              <div className="space-y-6">
                <Panel title={detail.rewardNo} eyebrow={detail.rewardType}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold text-[var(--color-paper)]">
                        {detail.totalAmount.toLocaleString()}원
                      </p>
                      <p className="mt-2 text-sm text-[#d6cabd]">
                        정책 {detail.policyVersionCode} · 등급 {detail.gradeCode ?? '미정'}
                      </p>
                    </div>
                    <StatusBadge value={detail.currentStatus} />
                  </div>
                  <div className="mt-6">
                    <LifecycleStepper steps={detail.lifecycle} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/rewards/${detail.id}/approve-request`, {
                          method: 'POST',
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                    >
                      승인 요청
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/rewards/${detail.id}/approve`, {
                          method: 'POST',
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent)]"
                    >
                      승인 완료
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/rewards/${detail.id}/payments`, {
                          method: 'POST',
                          body: JSON.stringify({
                            paymentMethod: 'ACCOUNT_TRANSFER',
                            accountingRefNo: `ACC-${Date.now()}`,
                          }),
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                    >
                      지급 완료
                    </button>
                  </div>
                </Panel>

                <Panel title="배분 및 계산 근거" eyebrow="Snapshot">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        산식
                      </p>
                      <p className="mt-3 text-sm text-[var(--color-paper)]">
                        {detail.calculationSnapshot.formula ?? 'matrix lookup'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        발명자별 배분
                      </p>
                      <div className="mt-3 space-y-2">
                        {detail.distributions.map((distribution) => (
                          <div
                            key={distribution.id}
                            className="flex items-center justify-between text-sm text-[var(--color-paper)]"
                          >
                            <span>{distribution.inventorName}</span>
                            <span>
                              {distribution.shareRatio}% ·{' '}
                              {(distribution.adjustedAmount ?? distribution.calculatedAmount).toLocaleString()}
                              원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        관련 객체
                      </p>
                      <p className="mt-3 text-sm text-[var(--color-paper)]">
                        평가 {detail.linkedEvaluation?.gradeCode ?? '없음'} · 정책{' '}
                        {detail.linkedPolicy?.versionCode ?? '없음'}
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel title="상태 이력" eyebrow="Timeline">
                  <Timeline items={detail.timeline} />
                  {detail.payments.length > 0 ? (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        지급 완료 내역
                      </p>
                      <div className="mt-3 space-y-2">
                        {detail.payments.map((payment) => (
                          <div key={payment.id} className="text-sm text-[var(--color-paper)]">
                            {payment.paymentStatus} · {formatDate(payment.paidAt)} ·{' '}
                            {payment.paymentMethod ?? '미정'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Panel>
              </div>
            ) : (
              <EmptyState
                title="선택된 보상 건이 없습니다"
                description="왼쪽 목록에서 보상 건을 선택하면 계산 근거와 상태 이력이 표시됩니다."
              />
            )
          }
        />
      ) : null}
    </div>
  );
}
