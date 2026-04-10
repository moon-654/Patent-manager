"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/panel";
import { useSession } from "@/components/session-provider";
import { apiFetch } from "@/lib/api";

type ShareRow = {
  id: string;
  inventorName: string;
  inventorNameEn: string;
  shareRatio: number;
  isPrimary: boolean;
  department: string;
  phoneNumber: string;
};

type AttachmentInput = {
  assignmentDeed: string;
  description: string;
  priorArtReport: string;
};

function createEmptyShare(defaultName = "", defaultDepartment = ""): ShareRow {
  return {
    id: crypto.randomUUID(),
    inventorName: defaultName,
    inventorNameEn: "",
    shareRatio: 100,
    isPrimary: true,
    department: defaultDepartment,
    phoneNumber: "",
  };
}

export default function NewSubmissionPage() {
  const router = useRouter();
  const { user } = useSession();
  const [saving, setSaving] = useState(false);
  const [titleKo, setTitleKo] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [summary, setSummary] = useState("");
  const [businessUnit, setBusinessUnit] = useState(user?.department ?? "");
  const [desiredCountries, setDesiredCountries] = useState("KR");
  const [technicalField, setTechnicalField] = useState("");
  const [background, setBackground] = useState("");
  const [technicalProblem, setTechnicalProblem] = useState("");
  const [solvingMeans, setSolvingMeans] = useState("");
  const [effect, setEffect] = useState("");
  const [claimsText, setClaimsText] = useState("");
  const [priorPatent, setPriorPatent] = useState("");
  const [noveltyDiff, setNoveltyDiff] = useState("");
  const [inventiveDiff, setInventiveDiff] = useState("");
  const [shares, setShares] = useState<ShareRow[]>([
    createEmptyShare(user?.name ?? "", user?.department ?? ""),
  ]);
  const [attachments, setAttachments] = useState<AttachmentInput>({
    assignmentDeed: "",
    description: "",
    priorArtReport: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function createSubmission(shouldSubmit: boolean) {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: titleKo,
        summary,
        businessUnit,
        shares: shares.map((share, index) => ({
          ...share,
          userId: index === 0 ? user?.id : undefined,
        })),
        attachments: [
          attachments.assignmentDeed
            ? {
                attachmentType: "ASSIGNMENT_DEED",
                originalName: attachments.assignmentDeed,
              }
            : null,
          attachments.description
            ? {
                attachmentType: "DESCRIPTION",
                originalName: attachments.description,
              }
            : null,
          attachments.priorArtReport
            ? {
                attachmentType: "PRIOR_ART_REPORT",
                originalName: attachments.priorArtReport,
              }
            : null,
        ].filter(Boolean),
        formData: {
          form1: {
            inventionTitleKo: titleKo,
            inventionTitleEn: titleEn,
            desiredCountries: desiredCountries
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            disclosureType: ["연구보고서"],
            inventionCategory: "JOB_INVENTION",
            inventionStage: "연구개발완료",
            additionalResearchNeeded: false,
            interestedCompanies: [],
            relatedProjectName: "",
            fundingAgency: "",
            researchPeriod: "",
            researchNoteManaged: false,
            researchNoteLocation: "",
            relatedPatentKeywords: "",
          },
          form2: {
            assignmentShares: shares.map((share) => ({
              inventorName: share.inventorName,
              shareRatio: share.shareRatio,
            })),
            assigneeName: "Ashimori Korea",
            assigneeTitle: "Representative Director",
            assigneeCompany: "Ashimori Korea",
          },
          form3: {
            technicalField,
            background,
            technicalProblem,
            solvingMeans,
            functionAndEffect: effect,
            examples: "",
            inventionEffect: effect,
            claims: claimsText
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          },
          form4: {
            priorPatentRows: [
              {
                existingPatent: priorPatent,
                noveltyDiff,
                inventiveDiff,
              },
            ],
            referenceRows: [],
          },
        },
      };

      const created = await apiFetch<{ id: string }>("/submissions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (shouldSubmit) {
        await apiFetch(`/submissions/${created.id}/submit`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      }

      router.push(`/submissions/${created.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "저장 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
          New Submission
        </p>
        <h1 className="font-display text-5xl text-[var(--color-paper)]">
          발명신고 초안 작성
        </h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-[#d18b77]/40 bg-[#5d2a24]/40 px-4 py-3 text-sm text-[#ffd4c4]">
          {error}
        </div>
      ) : null}

      <Panel title="기본 신고 정보" eyebrow="FORM1" className="max-w-5xl">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명의 명칭(한글)
            <input
              value={titleKo}
              onChange={(event) => setTitleKo(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명의 명칭(영문)
            <input
              value={titleEn}
              onChange={(event) => setTitleEn(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd] md:col-span-2">
            발명 개요
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            사업부
            <input
              value={businessUnit}
              onChange={(event) => setBusinessUnit(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            출원 희망국
            <input
              value={desiredCountries}
              onChange={(event) => setDesiredCountries(event.target.value)}
              placeholder="KR, US"
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
        </div>
      </Panel>

      <Panel title="발명자 및 지분" eyebrow="Inventors" className="max-w-5xl">
        <div className="space-y-4">
          {shares.map((share) => (
            <div
              key={share.id}
              className="grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 md:grid-cols-4"
            >
              <label className="grid gap-2 text-sm text-[#d7cabd]">
                발명자명
                <input
                  value={share.inventorName}
                  onChange={(event) =>
                    setShares((current) =>
                      current.map((row) =>
                        row.id === share.id
                          ? { ...row, inventorName: event.target.value }
                          : row,
                      ),
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--color-paper)] outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-[#d7cabd]">
                영문명
                <input
                  value={share.inventorNameEn}
                  onChange={(event) =>
                    setShares((current) =>
                      current.map((row) =>
                        row.id === share.id
                          ? { ...row, inventorNameEn: event.target.value }
                          : row,
                      ),
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--color-paper)] outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-[#d7cabd]">
                지분율
                <input
                  type="number"
                  value={share.shareRatio}
                  onChange={(event) =>
                    setShares((current) =>
                      current.map((row) =>
                        row.id === share.id
                          ? { ...row, shareRatio: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--color-paper)] outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-[#d7cabd]">
                부서
                <input
                  value={share.department}
                  onChange={(event) =>
                    setShares((current) =>
                      current.map((row) =>
                        row.id === share.id
                          ? { ...row, department: event.target.value }
                          : row,
                      ),
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--color-paper)] outline-none"
                />
              </label>
              <div className="md:col-span-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#d7cabd]">
                  <input
                    type="checkbox"
                    checked={share.isPrimary}
                    onChange={(event) =>
                      setShares((current) =>
                        current.map((row) => ({
                          ...row,
                          isPrimary:
                            row.id === share.id ? event.target.checked : false,
                        })),
                      )
                    }
                  />
                  대표 발명자
                </label>
                {shares.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setShares((current) =>
                        current.filter((row) => row.id !== share.id),
                      )
                    }
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f3e9dc]"
                  >
                    행 삭제
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setShares((current) => [
                ...current,
                {
                  ...createEmptyShare(),
                  shareRatio: 0,
                  isPrimary: false,
                },
              ])
            }
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
          >
            발명자 추가
          </button>
        </div>
      </Panel>

      <Panel title="발명 설명" eyebrow="FORM3" className="max-w-5xl">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            기술분야
            <textarea
              value={technicalField}
              onChange={(event) => setTechnicalField(event.target.value)}
              rows={2}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            배경기술
            <textarea
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            기술적 과제
            <textarea
              value={technicalProblem}
              onChange={(event) => setTechnicalProblem(event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            해결수단
            <textarea
              value={solvingMeans}
              onChange={(event) => setSolvingMeans(event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명의 효과
            <textarea
              value={effect}
              onChange={(event) => setEffect(event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            청구항
            <textarea
              value={claimsText}
              onChange={(event) => setClaimsText(event.target.value)}
              rows={4}
              placeholder="한 줄에 청구항 하나씩 입력"
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
        </div>
      </Panel>

      <Panel title="선행기술 조사" eyebrow="FORM4" className="max-w-5xl">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            기존 특허
            <input
              value={priorPatent}
              onChange={(event) => setPriorPatent(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            신규성 차이
            <textarea
              value={noveltyDiff}
              onChange={(event) => setNoveltyDiff(event.target.value)}
              rows={2}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            진보성 차이
            <textarea
              value={inventiveDiff}
              onChange={(event) => setInventiveDiff(event.target.value)}
              rows={2}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="필수 첨부 메타데이터"
        eyebrow="Required Attachments"
        className="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            양도증 파일명
            <input
              value={attachments.assignmentDeed}
              onChange={(event) =>
                setAttachments((current) => ({
                  ...current,
                  assignmentDeed: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명 설명서 파일명
            <input
              value={attachments.description}
              onChange={(event) =>
                setAttachments((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            선행기술 조사서 파일명
            <input
              value={attachments.priorArtReport}
              onChange={(event) =>
                setAttachments((current) => ({
                  ...current,
                  priorArtReport: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
        </div>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => createSubmission(false)}
          className="rounded-full border border-white/10 px-5 py-3 text-sm text-[#f3e9dc]"
        >
          {saving ? "저장 중..." : "초안 저장"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => createSubmission(true)}
          className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#1d1a17]"
        >
          {saving ? "제출 중..." : "검토 요청으로 제출"}
        </button>
      </div>
    </div>
  );
}
