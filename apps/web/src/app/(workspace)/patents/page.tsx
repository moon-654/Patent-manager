'use client';

import { useEffect, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { LifecycleStepper } from '@/components/lifecycle-stepper';
import { Panel } from '@/components/panel';
import { SplitDetailPane } from '@/components/split-detail-pane';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Timeline } from '@/components/timeline';
import { apiFetch, documentDownloadUrl } from '@/lib/api';
import type { PatentDetail, PatentSummary } from '@/lib/types';

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('ko-KR') : '-';
}

export default function PatentsPage() {
  const [rows, setRows] = useState<PatentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatentDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshAll(preferredId?: string) {
    const data = await apiFetch<PatentSummary[]>('/patents');
    setRows(data);
    const nextId = preferredId ?? selectedId ?? data[0]?.id ?? null;
    setSelectedId(nextId);
    if (nextId) {
      setDetail(await apiFetch<PatentDetail>(`/patents/${nextId}`));
    } else {
      setDetail(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const data = await apiFetch<PatentSummary[]>('/patents');
        if (!active) {
          return;
        }
        setRows(data);
        const firstId = data[0]?.id ?? null;
        setSelectedId(firstId);
        if (firstId) {
          const firstDetail = await apiFetch<PatentDetail>(`/patents/${firstId}`);
          if (active) {
            setDetail(firstDetail);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '특허 목록을 불러오지 못했습니다.',
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
      const nextDetail = await apiFetch<PatentDetail>(`/patents/${selectedId}`);
      if (active) {
        setDetail(nextDetail);
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
      row.title.toLowerCase().includes(keyword.toLowerCase()) ||
      row.applicationNo.toLowerCase().includes(keyword.toLowerCase());
    return matchesStatus && matchesKeyword;
  });

  const statuses = ['ALL', ...Array.from(new Set(rows.map((row) => row.currentStatus)))];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
          Patent Lifecycle
        </p>
        <h1 className="font-display text-5xl text-[var(--color-paper)]">
          출원, OA, 등록, 통지까지 보는 특허 보드
        </h1>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState title="특허 목록" /> : null}

      {!loading ? (
        <SplitDetailPane
          list={
            <Panel title="특허 및 OA 목록" eyebrow="List and Monitor">
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px]">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="출원번호, 발명명 검색"
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
                  title="조회 결과가 없습니다"
                  description="필터를 조정하면 다른 특허 건을 볼 수 있습니다."
                />
              ) : (
                <DataTable
                  rows={filteredRows}
                  rowKey={(row) => row.id}
                  selectedKey={selectedId ?? undefined}
                  onSelect={(row) => setSelectedId(row.id)}
                  columns={[
                    {
                      key: 'applicationNo',
                      header: '출원번호',
                      render: (row) => (
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-paper)]">
                            {row.applicationNo}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8f7f6f]">
                            {row.countryCode} · {row.rightType}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'title',
                      header: '발명명',
                      render: (row) => (
                        <div>
                          <p className="text-sm text-[var(--color-paper)]">{row.title}</p>
                          <p className="mt-1 text-xs text-[#c8bbad]">{row.assigneeName}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: '현재 단계',
                      render: (row) => <StatusBadge value={row.currentStatus} />,
                    },
                    {
                      key: 'oa',
                      header: 'OA',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {row.oaPending ? '대응 필요' : '없음'}
                        </div>
                      ),
                    },
                    {
                      key: 'dueDate',
                      header: '기한',
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {formatDate(row.dueDate)}
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
                <Panel title={detail.title} eyebrow={detail.applicationNo}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#d6cabd]">
                        담당자 {detail.assigneeName} · 현재 단계 {detail.currentStatusLabel}
                      </p>
                      <p className="mt-2 text-sm text-[#d6cabd]">
                        다음 액션 {detail.nextAction}
                        {detail.dueDate ? ` · OA 기한 ${formatDate(detail.dueDate)}` : ''}
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
                        await apiFetch(`/patents/${detail.id}/status-transition`, {
                          method: 'POST',
                          body: JSON.stringify({
                            toStatus:
                              detail.currentStatus === 'OA'
                                ? 'REGISTERED'
                                : detail.currentStatus === 'REGISTERED'
                                  ? 'ACTIVE'
                                  : 'OA',
                            reason: '특허 단계 수동 전이',
                          }),
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent)]"
                    >
                      다음 단계로 전이
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/patents/${detail.id}/application-notices`, {
                          method: 'POST',
                        });
                        await refreshAll(detail.id);
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                    >
                      별지 제9호 출원 통지서 생성
                    </button>
                  </div>
                </Panel>

                <Panel title="출원 통지 및 문서 이력" eyebrow="Form 9 and Snapshots">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        출원 통지서 이력
                      </p>
                      {detail.applicationNotices.length > 0 ? (
                        detail.applicationNotices.map((notice) => {
                          const linkedSnapshot = detail.formSnapshots.find(
                            (snapshot) => snapshot.formCode === 'FORM9',
                          );
                          return (
                            <div
                              key={notice.id}
                              className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                            >
                              <p className="text-sm text-[var(--color-paper)]">
                                {notice.documentNo} · {formatDate(notice.generatedAt)} ·{' '}
                                {notice.isFiled ? notice.applicationNo : '미출원'}
                              </p>
                              {linkedSnapshot ? (
                                <div className="mt-3 flex flex-wrap gap-3">
                                  <a
                                    href={documentDownloadUrl(linkedSnapshot.id, 'inline')}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f3e9dc]"
                                  >
                                    미리보기
                                  </a>
                                  <a
                                    href={documentDownloadUrl(linkedSnapshot.id, 'attachment')}
                                    className="rounded-full border border-[var(--color-accent)] px-3 py-2 text-xs text-[var(--color-accent)]"
                                  >
                                    다운로드
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <p className="mt-3 text-sm text-[#d8ccbf]">
                          아직 생성된 출원 통지서가 없습니다.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        생성된 문서 스냅샷
                      </p>
                      {detail.formSnapshots.length > 0 ? (
                        detail.formSnapshots.map((snapshot) => (
                          <div
                            key={snapshot.id}
                            className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                          >
                            <p className="text-sm text-[var(--color-paper)]">
                              {snapshot.formCode} · {snapshot.fileName}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-3">
                              <a
                                href={documentDownloadUrl(snapshot.id, 'inline')}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f3e9dc]"
                              >
                                미리보기
                              </a>
                              <a
                                href={documentDownloadUrl(snapshot.id, 'attachment')}
                                className="rounded-full border border-[var(--color-accent)] px-3 py-2 text-xs text-[var(--color-accent)]"
                              >
                                다운로드
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="mt-3 text-sm text-[#d8ccbf]">
                          생성된 문서 스냅샷이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </Panel>

                <Panel title="상태 타임라인" eyebrow="Why this state">
                  <Timeline items={detail.timeline} />
                </Panel>
              </div>
            ) : (
              <EmptyState
                title="선택된 특허가 없습니다"
                description="왼쪽 목록에서 특허를 선택하면 단계와 통지 이력을 볼 수 있습니다."
              />
            )
          }
        />
      ) : null}
    </div>
  );
}
