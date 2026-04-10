"use client";

import { useEffect, useState } from "react";

import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, LoadingState } from "@/components/states";
import { Timeline } from "@/components/timeline";
import { apiFetch, documentDownloadUrl } from "@/lib/api";
import type { GeneratedDocument, SubmissionDetail } from "@/lib/types";

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(
    null,
  );

  async function refresh(id: string) {
    const next = await apiFetch<SubmissionDetail>(`/submissions/${id}`);
    setDetail(next);
    if (!previewDocumentId) {
      const firstDoc = next.formSnapshots[0];
      setPreviewDocumentId(firstDoc?.id ?? null);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const resolved = await params;
      const next = await apiFetch<SubmissionDetail>(
        `/submissions/${resolved.id}`,
      );
      if (!active) {
        return;
      }
      setDetail(next);
      setPreviewDocumentId(next.formSnapshots[0]?.id ?? null);
    }

    void load();
    return () => {
      active = false;
    };
  }, [params]);

  if (!detail) {
    return <LoadingState title="발명신고 상세" />;
  }

  const previewDocument =
    detail.formSnapshots.find((doc) => doc.id === previewDocumentId) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
            {detail.submissionNo}
          </p>
          <h1 className="font-display text-5xl text-[var(--color-paper)]">
            {detail.title}
          </h1>
        </div>
        <StatusBadge value={detail.currentStatus} />
      </header>

      <Panel title="워크플로우" eyebrow="Lifecycle">
        <p className="text-sm text-[#d6cabd]">
          현재 상태 {detail.currentStatusLabel} · 결정 기한{" "}
          {formatDate(detail.decisionDueAt)} · Revision{" "}
          {detail.currentRevisionNo}
        </p>
        <div className="mt-6">
          <LifecycleStepper steps={detail.lifecycle} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {["FORM1", "FORM2", "FORM3_1", "FORM3_2", "FORM4"].map((formCode) => (
            <button
              key={formCode}
              type="button"
              onClick={async () => {
                const snapshot = await apiFetch<GeneratedDocument>(
                  `/submissions/${detail.id}/form-snapshots`,
                  {
                    method: "POST",
                    body: JSON.stringify({ formCode }),
                  },
                );
                await refresh(detail.id);
                setPreviewDocumentId(snapshot.id);
              }}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
            >
              {formCode} 생성
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="신고 내용" eyebrow="Structured Data">
          <div className="space-y-4 text-sm text-[#d8ccbf]">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                기본 정보
              </p>
              <p className="mt-3">
                발명명: {detail.formData.form1.inventionTitleKo}
              </p>
              <p className="mt-2">
                희망국:{" "}
                {detail.formData.form1.desiredCountries.join(", ") || "-"}
              </p>
              <p className="mt-2">
                단계: {detail.formData.form1.inventionStage}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                첨부 및 체크리스트
              </p>
              {detail.requiredAttachments.map((item) => (
                <p key={item.code} className="mt-3">
                  {item.label}: {item.uploaded ? "등록 완료" : "미등록"}
                </p>
              ))}
              {detail.checklist.map((item) => (
                <p key={item.code} className="mt-2">
                  {item.label}: {item.passed ? "통과" : "미통과"}
                </p>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                평가 및 회의록
              </p>
              <p className="mt-3">
                평가표 수: {detail.linkedEvaluations.length}
              </p>
              <p className="mt-2">
                회의록 수: {detail.linkedMeetingMinutes.length}
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="문서 및 통지" eyebrow="Snapshots">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                생성 문서
              </p>
              {detail.formSnapshots.length ? (
                detail.formSnapshots.map((document) => (
                  <div
                    key={document.id}
                    className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm text-[var(--color-paper)]">
                      {document.formCode} · {document.fileName}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewDocumentId(document.id)}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f3e9dc]"
                      >
                        미리보기
                      </button>
                      <a
                        href={documentDownloadUrl(document.id, "attachment")}
                        className="rounded-full border border-[var(--color-accent)] px-3 py-2 text-xs text-[var(--color-accent)]"
                      >
                        다운로드
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="mt-3 text-sm text-[#d8ccbf]">
                  생성된 문서가 없습니다.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f7f6f]">
                승계 통지
              </p>
              {detail.committeeNotices.length ? (
                detail.committeeNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm text-[var(--color-paper)]">
                      {notice.templateCode} · {notice.documentNo}
                    </p>
                    <p className="mt-2 text-sm text-[#d8ccbf]">
                      {notice.decisionItems.successionDecision} ·{" "}
                      {formatDate(notice.noticeDate)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="mt-3 text-sm text-[#d8ccbf]">
                  승계 통지가 아직 없습니다.
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="문서 미리보기" eyebrow="PDF Preview">
        {previewDocument ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#d6cabd]">
                현재 문서: {previewDocument.formCode} ·{" "}
                {previewDocument.fileName}
              </p>
              <a
                href={documentDownloadUrl(previewDocument.id, "attachment")}
                className="rounded-full border border-[var(--color-accent)] px-4 py-2 text-xs text-[var(--color-accent)]"
              >
                다운로드
              </a>
            </div>
            <iframe
              title={previewDocument.fileName}
              src={documentDownloadUrl(previewDocument.id, "inline")}
              className="h-[900px] w-full rounded-[24px] border border-white/10 bg-white"
            />
          </div>
        ) : (
          <EmptyState
            title="미리볼 문서가 없습니다"
            description="문서를 생성하면 이 영역에서 바로 확인할 수 있습니다."
          />
        )}
      </Panel>

      <Panel title="상태 타임라인" eyebrow="History">
        <Timeline items={detail.timeline} />
      </Panel>
    </div>
  );
}
