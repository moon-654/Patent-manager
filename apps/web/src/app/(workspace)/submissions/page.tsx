"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DataTable } from "@/components/data-table";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { Panel } from "@/components/panel";
import { SplitDetailPane } from "@/components/split-detail-pane";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Timeline } from "@/components/timeline";
import { apiFetch } from "@/lib/api";
import type { SubmissionDetail, SubmissionSummary } from "@/lib/types";

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}

export default function SubmissionsPage() {
  const [rows, setRows] = useState<SubmissionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDetail(id: string) {
    const next = await apiFetch<SubmissionDetail>(`/submissions/${id}`);
    setDetail(next);
  }

  async function refresh(preferredId?: string) {
    const data = await apiFetch<SubmissionSummary[]>("/submissions");
    setRows(data);
    const targetId = preferredId ?? selectedId ?? data[0]?.id ?? null;
    setSelectedId(targetId);
    if (targetId) {
      await loadDetail(targetId);
    } else {
      setDetail(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const data = await apiFetch<SubmissionSummary[]>("/submissions");
        if (!active) {
          return;
        }
        setRows(data);
        const firstId = data[0]?.id ?? null;
        setSelectedId(firstId);
        if (firstId) {
          const firstDetail = await apiFetch<SubmissionDetail>(
            `/submissions/${firstId}`,
          );
          if (active) {
            setDetail(firstDetail);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "발명신고 목록을 불러오지 못했습니다.",
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

  const filteredRows = rows.filter((row) => {
    const matchesStatus =
      statusFilter === "ALL" || row.currentStatus === statusFilter;
    const matchesKeyword =
      keyword.length === 0 ||
      row.title.toLowerCase().includes(keyword.toLowerCase()) ||
      row.submissionNo.toLowerCase().includes(keyword.toLowerCase()) ||
      row.ownerName.toLowerCase().includes(keyword.toLowerCase());
    return matchesStatus && matchesKeyword;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
            Submissions
          </p>
          <h1 className="font-display text-5xl text-[var(--color-paper)]">
            발명신고 워크스페이스
          </h1>
        </div>
        <Link
          href="/submissions/new"
          className="inline-flex rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#1d1a17]"
        >
          새 초안 작성
        </Link>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState title="발명신고 목록" /> : null}

      {!loading ? (
        <SplitDetailPane
          list={
            <Panel title="신고 목록" eyebrow="Filter and Select">
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px]">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="접수번호, 제목, 대표 발명자 검색"
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-paper)] outline-none placeholder:text-[#8f7f6f]"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-paper)] outline-none"
                >
                  <option value="ALL">전체 상태</option>
                  {Array.from(
                    new Set(rows.map((row) => row.currentStatus)),
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {filteredRows.length === 0 ? (
                <EmptyState
                  title="표시할 신고가 없습니다"
                  description="필터 조건을 바꾸거나 새 초안을 생성해 주세요."
                />
              ) : (
                <DataTable
                  rows={filteredRows}
                  rowKey={(row) => row.id}
                  selectedKey={selectedId ?? undefined}
                  onSelect={(row) => {
                    setSelectedId(row.id);
                    void loadDetail(row.id);
                  }}
                  columns={[
                    {
                      key: "submissionNo",
                      header: "접수번호",
                      render: (row) => (
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-paper)]">
                            {row.submissionNo}
                          </p>
                          <p className="mt-1 text-xs text-[#8f7f6f]">
                            {row.businessUnit}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "title",
                      header: "발명명",
                      render: (row) => (
                        <div>
                          <p className="text-sm text-[var(--color-paper)]">
                            {row.title}
                          </p>
                          <p className="mt-1 text-xs text-[#c8bbad]">
                            {row.summary}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "status",
                      header: "상태",
                      render: (row) => (
                        <StatusBadge value={row.currentStatus} />
                      ),
                    },
                    {
                      key: "owner",
                      header: "대표 발명자",
                      render: (row) => (
                        <div className="text-sm text-[var(--color-paper)]">
                          {row.ownerName}
                        </div>
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
                <Panel title={detail.title} eyebrow={detail.submissionNo}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#d6cabd]">
                        상태 {detail.currentStatusLabel} · 다음 액션{" "}
                        {detail.nextAction}
                      </p>
                      <p className="mt-2 text-sm text-[#d6cabd]">
                        Revision {detail.currentRevisionNo} · 결정 기한{" "}
                        {formatDate(detail.decisionDueAt)}
                      </p>
                    </div>
                    <StatusBadge value={detail.currentStatus} />
                  </div>
                  <div className="mt-6">
                    <LifecycleStepper steps={detail.lifecycle} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {detail.availableActions.includes("request-correction") ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(
                            `/submissions/${detail.id}/request-correction`,
                            {
                              method: "POST",
                              body: JSON.stringify({
                                reason: "필수 입력 또는 첨부를 보완해 주세요.",
                                checklistItems: detail.checklist,
                              }),
                            },
                          );
                          await refresh(detail.id);
                        }}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                      >
                        보완 요청
                      </button>
                    ) : null}
                    {detail.availableActions.includes(
                      "start-committee-review",
                    ) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(
                            `/submissions/${detail.id}/start-committee-review`,
                            {
                              method: "POST",
                              body: JSON.stringify({
                                checklistItems: detail.checklist.map(
                                  (item) => ({
                                    ...item,
                                    passed: true,
                                  }),
                                ),
                                note: "형식 검토를 통과했습니다.",
                              }),
                            },
                          );
                          await refresh(detail.id);
                        }}
                        className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent)]"
                      >
                        위원회 검토 시작
                      </button>
                    ) : null}
                    {detail.availableActions.includes(
                      "record-succession-decision",
                    ) ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(
                              `/submissions/${detail.id}/succession-decision`,
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  decisionType: "ACCEPT",
                                  reason: "평가 결과에 따라 승계로 결정합니다.",
                                }),
                              },
                            );
                            await refresh(detail.id);
                          }}
                          className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent)]"
                        >
                          승계 결정
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(
                              `/submissions/${detail.id}/succession-decision`,
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  decisionType: "HOLD",
                                  reason: "출원 유보로 결정합니다.",
                                }),
                              },
                            );
                            await refresh(detail.id);
                          }}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                        >
                          출원 유보
                        </button>
                      </>
                    ) : null}
                    {detail.availableActions.includes("create-evaluation") ? (
                      <Link
                        href="/evaluations"
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                      >
                        평가 워크스페이스 이동
                      </Link>
                    ) : null}
                    <Link
                      href={`/submissions/${detail.id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
                    >
                      상세 보기
                    </Link>
                  </div>
                </Panel>

                <Panel title="점검 현황" eyebrow="Attachments and Checklist">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        필수 첨부
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-[var(--color-paper)]">
                        {detail.requiredAttachments.map((item) => (
                          <div
                            key={item.code}
                            className="flex items-center justify-between"
                          >
                            <span>{item.label}</span>
                            <span>{item.uploaded ? "완료" : "미등록"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        체크리스트
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-[var(--color-paper)]">
                        {detail.checklist.map((item) => (
                          <div
                            key={item.code}
                            className="flex items-center justify-between"
                          >
                            <span>{item.label}</span>
                            <span>{item.passed ? "통과" : "미통과"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="연계 현황" eyebrow="Evaluations and Minutes">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        평가표
                      </p>
                      <div className="mt-3 space-y-2">
                        {detail.linkedEvaluations.length ? (
                          detail.linkedEvaluations.map((evaluation) => (
                            <div
                              key={evaluation.id}
                              className="text-sm text-[var(--color-paper)]"
                            >
                              {evaluation.evaluationRound}차 ·{" "}
                              {evaluation.gradeCode} · {evaluation.totalScore}점
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#d6cabd]">
                            연결된 평가표가 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        회의록
                      </p>
                      <div className="mt-3 space-y-2">
                        {detail.linkedMeetingMinutes.length ? (
                          detail.linkedMeetingMinutes.map((minute) => (
                            <div
                              key={minute.id}
                              className="text-sm text-[var(--color-paper)]"
                            >
                              {minute.title} · {formatDate(minute.meetingDate)}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#d6cabd]">
                            연결된 회의록이 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="상태 타임라인" eyebrow="Workflow Events">
                  <Timeline items={detail.timeline} />
                </Panel>
              </div>
            ) : (
              <EmptyState
                title="선택된 신고가 없습니다"
                description="왼쪽 목록에서 신고 건을 선택해 주세요."
              />
            )
          }
        />
      ) : null}
    </div>
  );
}
