"use client";

import { useEffect, useState } from "react";

import { DataTable } from "@/components/data-table";
import { Panel } from "@/components/panel";
import { SplitDetailPane } from "@/components/split-detail-pane";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { apiFetch } from "@/lib/api";
import type {
  EvaluationSummary,
  MeetingMinute,
  SubmissionSummary,
} from "@/lib/types";

type EvaluationTargets = {
  policyVersionId: string;
  policyVersionCode: string;
  grades: {
    gradeCode: string;
    gradeName: string;
    minScore: number;
    maxScore: number;
  }[];
  criteria: {
    criterionCode: string;
    criterionName: string;
    maxScore: number;
    levels: {
      levelCode: string;
      levelName: string;
      mappedScore: number;
    }[];
  }[];
  submissions: SubmissionSummary[];
  patents: { id: string; title: string }[];
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}

export default function EvaluationsPage() {
  const [targets, setTargets] = useState<EvaluationTargets | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [levelSelections, setLevelSelections] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const [targetData, evaluationData, minuteData] = await Promise.all([
      apiFetch<EvaluationTargets>("/evaluations/targets"),
      apiFetch<EvaluationSummary[]>("/evaluations"),
      apiFetch<MeetingMinute[]>("/meeting-minutes"),
    ]);

    setTargets(targetData);
    setEvaluations(evaluationData);
    setMinutes(minuteData);
    setSelectedId((current) => current ?? evaluationData[0]?.id ?? null);
    setSelectedTargetId(
      (current) => current || targetData.submissions[0]?.id || "",
    );

    if (!Object.keys(levelSelections).length && targetData.criteria.length) {
      const nextSelections: Record<string, string> = {};
      targetData.criteria.forEach((criterion) => {
        nextSelections[criterion.criterionCode] =
          criterion.levels[0]?.levelCode ?? "";
      });
      setLevelSelections(nextSelections);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const [targetData, evaluationData, minuteData] = await Promise.all([
          apiFetch<EvaluationTargets>("/evaluations/targets"),
          apiFetch<EvaluationSummary[]>("/evaluations"),
          apiFetch<MeetingMinute[]>("/meeting-minutes"),
        ]);

        if (!active) {
          return;
        }

        setTargets(targetData);
        setEvaluations(evaluationData);
        setMinutes(minuteData);
        setSelectedId(evaluationData[0]?.id ?? null);
        setSelectedTargetId(targetData.submissions[0]?.id ?? "");
        const nextSelections: Record<string, string> = {};
        targetData.criteria.forEach((criterion) => {
          nextSelections[criterion.criterionCode] =
            criterion.levels[0]?.levelCode ?? "";
        });
        setLevelSelections(nextSelections);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "평가 정보를 불러오지 못했습니다.",
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

  const selectedEvaluation =
    evaluations.find((evaluation) => evaluation.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
          Committee Workspace
        </p>
        <h1 className="font-display text-5xl text-[var(--color-paper)]">
          평가 및 회의록 관리
        </h1>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState title="평가 화면" /> : null}

      {!loading ? (
        <SplitDetailPane
          list={
            <div className="space-y-6">
              <Panel
                title="평가 생성"
                eyebrow={targets?.policyVersionCode ?? "Active Policy"}
              >
                {targets?.submissions.length ? (
                  <div className="space-y-4">
                    <select
                      value={selectedTargetId}
                      onChange={(event) =>
                        setSelectedTargetId(event.target.value)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-paper)] outline-none"
                    >
                      {targets.submissions.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.submissionNo} · {target.title}
                        </option>
                      ))}
                    </select>
                    {targets.criteria.map((criterion) => (
                      <div
                        key={criterion.criterionCode}
                        className="rounded-2xl border border-white/10 bg-black/10 p-4"
                      >
                        <p className="text-sm text-[var(--color-paper)]">
                          {criterion.criterionName}
                        </p>
                        <select
                          value={levelSelections[criterion.criterionCode] ?? ""}
                          onChange={(event) =>
                            setLevelSelections((current) => ({
                              ...current,
                              [criterion.criterionCode]: event.target.value,
                            }))
                          }
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[var(--color-paper)] outline-none"
                        >
                          {criterion.levels.map((level) => (
                            <option
                              key={level.levelCode}
                              value={level.levelCode}
                            >
                              {level.levelName} ({level.mappedScore})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!targets || !selectedTargetId) {
                          return;
                        }
                        await apiFetch("/evaluations", {
                          method: "POST",
                          body: JSON.stringify({
                            targetType: "SUBMISSION",
                            targetId: selectedTargetId,
                            items: targets.criteria.map((criterion) => {
                              const selectedLevel =
                                criterion.levels.find(
                                  (level) =>
                                    level.levelCode ===
                                    levelSelections[criterion.criterionCode],
                                ) ?? criterion.levels[0];
                              return {
                                criterionCode: criterion.criterionCode,
                                selectedLevelCode: selectedLevel.levelCode,
                                selectedScore: selectedLevel.mappedScore,
                              };
                            }),
                          }),
                        });
                        await reload();
                      }}
                      className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#1d1a17]"
                    >
                      평가 생성
                    </button>
                  </div>
                ) : (
                  <EmptyState
                    title="평가 대상이 없습니다"
                    description="위원회 검토 상태의 발명신고가 생기면 여기서 평가를 생성할 수 있습니다."
                  />
                )}
              </Panel>

              <Panel title="평가 목록" eyebrow="Scoring Overview">
                {evaluations.length === 0 ? (
                  <EmptyState
                    title="평가표가 없습니다"
                    description="위원회 검토 대상에 대해 새 평가를 생성해 주세요."
                  />
                ) : (
                  <DataTable
                    rows={evaluations}
                    rowKey={(row) => row.id}
                    selectedKey={selectedId ?? undefined}
                    onSelect={(row) => setSelectedId(row.id)}
                    columns={[
                      {
                        key: "target",
                        header: "대상",
                        render: (row) => (
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-paper)]">
                              {row.targetLabel}
                            </p>
                            <p className="mt-1 text-xs text-[#c8bbad]">
                              {row.policyVersionCode} · {row.evaluatorName}
                            </p>
                          </div>
                        ),
                      },
                      {
                        key: "status",
                        header: "상태",
                        render: (row) => <StatusBadge value={row.status} />,
                      },
                      {
                        key: "score",
                        header: "총점",
                        render: (row) => (
                          <div className="text-sm text-[var(--color-paper)]">
                            {row.totalScore}
                          </div>
                        ),
                      },
                      {
                        key: "grade",
                        header: "등급",
                        render: (row) => (
                          <div className="text-sm text-[#f0d3ab]">
                            {row.gradeCode}
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
              </Panel>
            </div>
          }
          detail={
            <div className="space-y-6">
              <Panel title="평가 상세" eyebrow="Evaluation Detail">
                {selectedEvaluation ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl text-[var(--color-paper)]">
                          {selectedEvaluation.targetLabel}
                        </h3>
                        <p className="mt-2 text-sm text-[#d5c8bb]">
                          {selectedEvaluation.policyVersionCode} ·{" "}
                          {selectedEvaluation.evaluatorName}
                        </p>
                      </div>
                      <StatusBadge value={selectedEvaluation.status} />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-sm text-[var(--color-paper)]">
                        총점 {selectedEvaluation.totalScore} · 등급{" "}
                        {selectedEvaluation.gradeCode}
                      </p>
                      <p className="mt-2 text-sm text-[#d5c8bb]">
                        라운드 {selectedEvaluation.evaluationRound}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                        평가기준별 선택
                      </p>
                      {selectedEvaluation.items?.map((item) => (
                        <p
                          key={item.id}
                          className="mt-3 text-sm text-[var(--color-paper)]"
                        >
                          {item.criterionName}: {item.selectedLevelName} (
                          {item.selectedScore})
                        </p>
                      ))}
                    </div>
                    {!selectedEvaluation.isLocked ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(
                            `/evaluations/${selectedEvaluation.id}/finalize`,
                            {
                              method: "POST",
                              body: JSON.stringify({
                                note: "위원회 평가 확정",
                              }),
                            },
                          );
                          await reload();
                        }}
                        className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent)]"
                      >
                        평가 확정
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState
                    title="선택된 평가표가 없습니다"
                    description="왼쪽 목록에서 평가표를 선택해 주세요."
                  />
                )}
              </Panel>

              <Panel title="회의록" eyebrow="Retention 3 Years">
                <button
                  type="button"
                  disabled={!selectedEvaluation || !selectedEvaluation.isLocked}
                  onClick={async () => {
                    if (!selectedEvaluation) {
                      return;
                    }
                    const created = await apiFetch<MeetingMinute>(
                      "/meeting-minutes",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          title: `${selectedEvaluation.targetLabel} 심의회의록`,
                          meetingDate: new Date().toISOString(),
                          attendees: [{ value: "위원장" }, { value: "간사" }],
                          agenda: [
                            {
                              value: `${selectedEvaluation.targetLabel} 평가 결과 확정`,
                            },
                          ],
                          resolution: `${selectedEvaluation.gradeCode} 등급으로 평가 결과를 확정함`,
                          linkedSubmissionIds:
                            selectedEvaluation.targetType === "SUBMISSION"
                              ? [selectedEvaluation.targetId]
                              : [],
                          linkedEvaluationIds: [selectedEvaluation.id],
                        }),
                      },
                    );
                    await apiFetch(`/meeting-minutes/${created.id}/approve`, {
                      method: "POST",
                      body: JSON.stringify({ note: "승인 완료" }),
                    });
                    await reload();
                  }}
                  className="mb-4 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#1d1a17] disabled:opacity-50"
                >
                  회의록 생성 및 승인
                </button>
                <div className="space-y-3">
                  {minutes.map((minute) => (
                    <div
                      key={minute.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[var(--color-paper)]">
                          {minute.title}
                        </h3>
                        <StatusBadge value={minute.status} />
                      </div>
                      <p className="mt-2 text-sm text-[#d5c8bb]">
                        회의일 {formatDate(minute.meetingDate)} · 보관 만료{" "}
                        {formatDate(minute.retentionUntil)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
