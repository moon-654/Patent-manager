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
import type { PolicyDetail, PolicySummary } from '@/lib/types';

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('ko-KR') : '-';
}

export default function PoliciesPage() {
  const [rows, setRows] = useState<PolicySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PolicyDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [simulation, setSimulation] = useState<{
    simulatedAmount: number;
    grade: { gradeCode: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshAll(preferredId?: string) {
    const data = await apiFetch<PolicySummary[]>('/policies');
    setRows(data);
    const nextId = preferredId ?? selectedId ?? data[0]?.id ?? null;
    setSelectedId(nextId);
    if (nextId) {
      setDetail(await apiFetch<PolicyDetail>(`/policies/${nextId}`));
    } else {
      setDetail(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const data = await apiFetch<PolicySummary[]>('/policies');
        if (!active) {
          return;
        }
        setRows(data);
        const firstId = data[0]?.id ?? null;
        setSelectedId(firstId);
        if (firstId) {
          const firstDetail = await apiFetch<PolicyDetail>(`/policies/${firstId}`);
          if (active) {
            setDetail(firstDetail);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '정책 목록을 불러오지 못했습니다.',
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
      const data = await apiFetch<PolicyDetail>(`/policies/${selectedId}`);
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
      row.versionCode.toLowerCase().includes(keyword.toLowerCase()) ||
      row.name.toLowerCase().includes(keyword.toLowerCase());
    return matchesStatus && matchesKeyword;
  });

  const statuses = ['ALL', ...Array.from(new Set(rows.map((row) => row.currentStatus)))];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
            Policy Control
          </p>
          <h1 className="font-display text-5xl text-[var(--color-paper)]">
            정책 버전과 시뮬레이션
          </h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            const created = await apiFetch<PolicyDetail>('/policies', {
              method: 'POST',
              body: JSON.stringify({
                versionCode: `AKS-A024-v${rows.length + 1}`,
                name: `정책 초안 v${rows.length + 1}`,
                changeSummary: '업무형 UX 개편 데모에서 생성한 정책 초안',
              }),
            });
            await refreshAll(created.id);
          }}
          className="inline-flex rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#1d1a17]"
        >
          새 정책 초안 생성
        </button>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState title="정책 목록" /> : null}

      {!loading ? (
        <SplitDetailPane
          list={
            <Panel title="정책 버전 목록" eyebrow="Compare and Activate">
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px]">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="버전 코드, 정책명 검색"
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
                  title="정책 버전이 없습니다"
                  description="새 정책 초안을 생성해 비교·시뮬레이션을 진행할 수 있습니다."
                />
              ) : (
                <DataTable
                  rows={filteredRows}
                  rowKey={(row) => row.id}
                  selectedKey={selectedId ?? undefined}
                  onSelect={(row) => setSelectedId(row.id)}
                  columns={[
                    {
                      key: 'versionCode',
                      header: '버전',
                      render: (row) => (
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-paper)]">
                            {row.versionCode}
                          </p>
                          <p className="mt-1 text-xs text-[#c8bbad]">{row.name}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'summary',
                      header: '변경요약',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {row.changeSummary}
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: '상태',
                      render: (row) => <StatusBadge value={row.currentStatus} />,
                    },
                    {
                      key: 'effectiveDate',
                      header: '시행일',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {formatDate(row.effectiveDate)}
                        </div>
                      ),
                    },
                    {
                      key: 'rows',
                      header: '보상/기준 수',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {row.rewardRows} / {row.criteriaCount}
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
                <Panel title={detail.name} eyebrow={detail.versionCode}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#d6cabd]">{detail.changeSummary}</p>
                      <p className="mt-2 text-sm text-[#d6cabd]">
                        작성자 {detail.ownerName} · 시행일 {formatDate(detail.effectiveDate)}
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
                        const result = await apiFetch<{
                          simulatedAmount: number;
                          grade: { gradeCode: string };
                        }>(`/policies/${detail.id}/simulate`, {
                          method: 'POST',
                          body: JSON.stringify({
                            totalScore: 82,
                            rewardType: 'APPLICATION',
                            rightType: 'PATENT',
                          }),
                        });
                        setSimulation(result);
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                    >
                      시뮬레이션
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/policies/${detail.id}/activate`, {
                          method: 'POST',
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent)]"
                    >
                      적용중 전환
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/policies/${detail.id}/announcements`, {
                          method: 'POST',
                          body: JSON.stringify({
                            title: `${detail.versionCode} 변경 공지`,
                            body: detail.changeSummary,
                          }),
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                    >
                      공지 발송
                    </button>
                  </div>
                </Panel>

                <Panel title="정책 상세" eyebrow="Grades · Criteria · Formula">
                  <div className="space-y-4">
                    {simulation ? (
                      <div className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">
                          시뮬레이션 결과
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-[var(--color-paper)]">
                          {simulation.simulatedAmount.toLocaleString()}원
                        </p>
                        <p className="mt-2 text-sm text-[#ead6bd]">
                          예상 등급 {simulation.grade.gradeCode}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        등급 구간
                      </p>
                      <div className="mt-3 space-y-2">
                        {detail.grades.map((grade) => (
                          <div key={grade.gradeCode} className="text-sm text-[var(--color-paper)]">
                            {grade.gradeName} · {grade.minScore} ~ {grade.maxScore}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        평가 기준
                      </p>
                      <div className="mt-3 space-y-3">
                        {detail.criteria.map((criterion) => (
                          <div key={criterion.criterionCode} className="text-sm text-[var(--color-paper)]">
                            <p>{criterion.criterionName}</p>
                            <p className="mt-1 text-xs text-[#c8bbad]">
                              {criterion.levels
                                .map((level) => `${level.levelName} ${level.mappedScore}`)
                                .join(' · ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="정책 이력" eyebrow="Announcements and Timeline">
                  <Timeline items={detail.timeline} />
                </Panel>
              </div>
            ) : (
              <EmptyState
                title="선택된 정책이 없습니다"
                description="왼쪽 목록에서 정책 버전을 선택하면 시뮬레이션과 기준표를 볼 수 있습니다."
              />
            )
          }
        />
      ) : null}
    </div>
  );
}
