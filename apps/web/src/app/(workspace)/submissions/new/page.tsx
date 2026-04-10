"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/states";
import { Panel } from "@/components/panel";
import { useSession } from "@/components/session-provider";
import { apiFetch } from "@/lib/api";
import type { SubmissionDetail } from "@/lib/types";

type ShareRow = {
  id: string;
  inventorName: string;
  inventorNameEn: string;
  shareRatio: number;
  isPrimary: boolean;
  department: string;
  phoneNumber: string;
};

type DraftAttachmentKey = "assignmentDeed" | "description" | "priorArtReport";

type DraftAttachmentState = {
  key: DraftAttachmentKey;
  label: string;
  attachmentType: "ASSIGNMENT_DEED" | "DESCRIPTION" | "PRIOR_ART_REPORT";
  required: boolean;
  uploaded: boolean;
  fileName: string;
  uploadStatus: "idle" | "uploading" | "uploaded" | "error";
  error?: string;
};

type DraftFormState = {
  titleKo: string;
  titleEn: string;
  summary: string;
  businessUnit: string;
  desiredCountries: string;
  technicalField: string;
  background: string;
  technicalProblem: string;
  solvingMeans: string;
  effect: string;
  claims: string[];
  priorPatent: string;
  noveltyDiff: string;
  inventiveDiff: string;
  shares: ShareRow[];
  attachments: Record<DraftAttachmentKey, DraftAttachmentState>;
};

const DRAFT_STORAGE_PREFIX = "submission-draft-id";

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

function createAttachmentState(): Record<
  DraftAttachmentKey,
  DraftAttachmentState
> {
  return {
    assignmentDeed: {
      key: "assignmentDeed",
      label: "양도증",
      attachmentType: "ASSIGNMENT_DEED",
      required: true,
      uploaded: false,
      fileName: "",
      uploadStatus: "idle",
    },
    description: {
      key: "description",
      label: "발명 설명서",
      attachmentType: "DESCRIPTION",
      required: true,
      uploaded: false,
      fileName: "",
      uploadStatus: "idle",
    },
    priorArtReport: {
      key: "priorArtReport",
      label: "선행기술 조사서",
      attachmentType: "PRIOR_ART_REPORT",
      required: true,
      uploaded: false,
      fileName: "",
      uploadStatus: "idle",
    },
  };
}

function createInitialFormState(
  user?: { name?: string; department?: string } | null,
): DraftFormState {
  return {
    titleKo: "",
    titleEn: "",
    summary: "",
    businessUnit: user?.department ?? "",
    desiredCountries: "KR",
    technicalField: "",
    background: "",
    technicalProblem: "",
    solvingMeans: "",
    effect: "",
    claims: [""],
    priorPatent: "",
    noveltyDiff: "",
    inventiveDiff: "",
    shares: [createEmptyShare(user?.name ?? "", user?.department ?? "")],
    attachments: createAttachmentState(),
  };
}

function getDraftStorageKey(userId?: string) {
  return `${DRAFT_STORAGE_PREFIX}:${userId ?? "anonymous"}`;
}

function sanitizeClaims(claims: string[]) {
  return claims.map((claim) => claim.trim()).filter(Boolean);
}

function sumShares(shares: ShareRow[]) {
  return shares.reduce((sum, share) => sum + Number(share.shareRatio || 0), 0);
}

function buildValidationSummary(state: DraftFormState) {
  const issues: { section: string; items: string[] }[] = [];
  const form1Issues = [
    !state.titleKo.trim() && "발명의 명칭(한글)이 필요합니다.",
    !state.summary.trim() && "발명 개요가 필요합니다.",
    !state.desiredCountries
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length && "출원 희망국이 필요합니다.",
  ].filter(Boolean) as string[];
  const shareTotal = sumShares(state.shares);
  const inventorIssues = [
    state.shares.some((share) => !share.inventorName.trim()) &&
      "모든 발명자명은 필수입니다.",
    state.shares.filter((share) => share.isPrimary).length !== 1 &&
      "대표 발명자는 정확히 1명이어야 합니다.",
    shareTotal !== 100 &&
      `지분율 합계가 100%가 아닙니다. 현재 ${shareTotal}%입니다.`,
  ].filter(Boolean) as string[];
  const form3Issues = [
    !state.technicalField.trim() && "기술분야가 필요합니다.",
    !state.background.trim() && "배경기술이 필요합니다.",
    !state.technicalProblem.trim() && "기술적 과제가 필요합니다.",
    !state.solvingMeans.trim() && "해결수단이 필요합니다.",
    !state.effect.trim() && "발명의 효과가 필요합니다.",
    sanitizeClaims(state.claims).length === 0 &&
      "최소 1개의 청구항이 필요합니다.",
  ].filter(Boolean) as string[];
  const attachmentIssues = Object.values(state.attachments)
    .filter((item) => item.required && !item.uploaded)
    .map((item) => `${item.label} 업로드가 필요합니다.`);

  if (form1Issues.length)
    issues.push({ section: "기본 정보", items: form1Issues });
  if (inventorIssues.length)
    issues.push({ section: "발명자/지분", items: inventorIssues });
  if (form3Issues.length)
    issues.push({ section: "발명 설명", items: form3Issues });
  if (attachmentIssues.length)
    issues.push({ section: "필수 첨부", items: attachmentIssues });

  return issues;
}

function mapDetailToDraft(detail: SubmissionDetail): DraftFormState {
  const nextAttachments = createAttachmentState();

  detail.attachments.forEach((attachment) => {
    if (attachment.type === "ASSIGNMENT_DEED") {
      nextAttachments.assignmentDeed = {
        ...nextAttachments.assignmentDeed,
        uploaded: true,
        fileName: attachment.originalName,
        uploadStatus: "uploaded",
      };
    }
    if (attachment.type === "DESCRIPTION") {
      nextAttachments.description = {
        ...nextAttachments.description,
        uploaded: true,
        fileName: attachment.originalName,
        uploadStatus: "uploaded",
      };
    }
    if (attachment.type === "PRIOR_ART_REPORT") {
      nextAttachments.priorArtReport = {
        ...nextAttachments.priorArtReport,
        uploaded: true,
        fileName: attachment.originalName,
        uploadStatus: "uploaded",
      };
    }
  });

  return {
    titleKo: detail.formData.form1.inventionTitleKo,
    titleEn: detail.formData.form1.inventionTitleEn ?? "",
    summary: detail.summary,
    businessUnit: detail.businessUnit,
    desiredCountries: detail.formData.form1.desiredCountries.join(", "),
    technicalField: detail.formData.form3.technicalField ?? "",
    background: detail.formData.form3.background ?? "",
    technicalProblem: detail.formData.form3.technicalProblem ?? "",
    solvingMeans: detail.formData.form3.solvingMeans ?? "",
    effect:
      detail.formData.form3.inventionEffect ??
      detail.formData.form3.functionAndEffect ??
      "",
    claims:
      detail.formData.form3.claims.length > 0
        ? detail.formData.form3.claims
        : [""],
    priorPatent: detail.formData.form4.priorPatentRows[0]?.existingPatent ?? "",
    noveltyDiff: detail.formData.form4.priorPatentRows[0]?.noveltyDiff ?? "",
    inventiveDiff:
      detail.formData.form4.priorPatentRows[0]?.inventiveDiff ?? "",
    shares: detail.shares.map((share) => ({
      id: share.id,
      inventorName: share.inventorName,
      inventorNameEn: share.inventorNameEn ?? "",
      shareRatio: share.shareRatio,
      isPrimary: share.isPrimary,
      department: share.department ?? "",
      phoneNumber: share.phoneNumber ?? "",
    })),
    attachments: nextAttachments,
  };
}

function buildDraftPayload(state: DraftFormState, userId?: string) {
  return {
    title: state.titleKo,
    summary: state.summary,
    businessUnit: state.businessUnit,
    shares: state.shares.map((share, index) => ({
      ...share,
      userId: index === 0 ? userId : undefined,
    })),
    formData: {
      form1: {
        inventionTitleKo: state.titleKo,
        inventionTitleEn: state.titleEn,
        desiredCountries: state.desiredCountries
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
        assignmentShares: state.shares.map((share) => ({
          inventorName: share.inventorName,
          shareRatio: share.shareRatio,
        })),
        assigneeName: "Ashimori Korea",
        assigneeTitle: "Representative Director",
        assigneeCompany: "Ashimori Korea",
      },
      form3: {
        technicalField: state.technicalField,
        background: state.background,
        technicalProblem: state.technicalProblem,
        solvingMeans: state.solvingMeans,
        functionAndEffect: state.effect,
        examples: "",
        inventionEffect: state.effect,
        claims: sanitizeClaims(state.claims),
      },
      form4: {
        priorPatentRows: [
          {
            existingPatent: state.priorPatent,
            noveltyDiff: state.noveltyDiff,
            inventiveDiff: state.inventiveDiff,
          },
        ],
        referenceRows: [],
      },
    },
  };
}

export default function NewSubmissionPage() {
  const router = useRouter();
  const { user } = useSession();
  const autosaveTimerRef = useRef<number | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [formState, setFormState] = useState<DraftFormState>(() =>
    createInitialFormState(user),
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validationSummary = useMemo(
    () => buildValidationSummary(formState),
    [formState],
  );

  async function loadDraft(id: string) {
    const detail = await apiFetch<SubmissionDetail>(`/submissions/${id}`);
    setDraftId(detail.id);
    setFormState(mapDetailToDraft(detail));
    setLastSavedAt(detail.updatedAt);
    setIsDirty(false);
    return detail;
  }

  useEffect(() => {
    let active = true;

    async function hydrateDraft() {
      if (!user?.id) return;
      try {
        const storedDraftId = window.localStorage.getItem(
          getDraftStorageKey(user.id),
        );
        if (storedDraftId) {
          const detail = await apiFetch<SubmissionDetail>(
            `/submissions/${storedDraftId}`,
          );
          if (!active) return;
          setDraftId(detail.id);
          setFormState(mapDetailToDraft(detail));
          setLastSavedAt(detail.updatedAt);
        } else {
          setFormState(createInitialFormState(user));
        }
      } catch {
        window.localStorage.removeItem(getDraftStorageKey(user?.id));
        setFormState(createInitialFormState(user));
      } finally {
        if (active) setLoading(false);
      }
    }

    void hydrateDraft();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!draftId || !isDirty) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        setIsAutosaving(true);
        await apiFetch(`/submissions/${draftId}`, {
          method: "PATCH",
          body: JSON.stringify(buildDraftPayload(formState, user?.id)),
        });
        setLastSavedAt(new Date().toISOString());
        setIsDirty(false);
        setSubmitError(null);
      } catch (autosaveError) {
        setError(
          autosaveError instanceof Error
            ? autosaveError.message
            : "자동저장 중 오류가 발생했습니다.",
        );
      } finally {
        setIsAutosaving(false);
      }
    }, 1200);
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [draftId, formState, isDirty, user?.id]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  function updateForm<K extends keyof DraftFormState>(
    key: K,
    value: DraftFormState[K],
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
    setError(null);
  }

  async function ensureDraftCreated() {
    if (draftId) return draftId;

    setCreating(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>("/submissions", {
        method: "POST",
        body: JSON.stringify(buildDraftPayload(formState, user?.id)),
      });
      setDraftId(created.id);
      setLastSavedAt(new Date().toISOString());
      setIsDirty(false);
      if (user?.id) {
        window.localStorage.setItem(getDraftStorageKey(user.id), created.id);
      }
      return created.id;
    } finally {
      setCreating(false);
    }
  }

  async function handleManualCreate() {
    try {
      const createdId = await ensureDraftCreated();
      await loadDraft(createdId);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "초안 생성 중 오류가 발생했습니다.",
      );
    }
  }

  async function handleAttachmentUpload(
    key: DraftAttachmentKey,
    file: File | null,
  ) {
    if (!file) return;

    try {
      const currentDraftId = await ensureDraftCreated();
      setFormState((current) => ({
        ...current,
        attachments: {
          ...current.attachments,
          [key]: {
            ...current.attachments[key],
            uploadStatus: "uploading",
            error: undefined,
          },
        },
      }));

      const formData = new FormData();
      formData.append(
        "attachmentType",
        formState.attachments[key].attachmentType,
      );
      formData.append("file", file);

      await apiFetch(`/submissions/${currentDraftId}/attachments`, {
        method: "POST",
        body: formData,
      });

      await loadDraft(currentDraftId);
      setFormState((current) => ({
        ...current,
        attachments: {
          ...current.attachments,
          [key]: {
            ...current.attachments[key],
            uploaded: true,
            fileName: file.name,
            uploadStatus: "uploaded",
            error: undefined,
          },
        },
      }));
    } catch (uploadError) {
      setFormState((current) => ({
        ...current,
        attachments: {
          ...current.attachments,
          [key]: {
            ...current.attachments[key],
            uploadStatus: "error",
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "업로드 실패",
          },
        },
      }));
    }
  }

  async function handleSubmit() {
    try {
      setSubmitError(null);
      const currentDraftId = await ensureDraftCreated();

      if (isDirty) {
        setIsAutosaving(true);
        await apiFetch(`/submissions/${currentDraftId}`, {
          method: "PATCH",
          body: JSON.stringify(buildDraftPayload(formState, user?.id)),
        });
        setLastSavedAt(new Date().toISOString());
        setIsDirty(false);
        setIsAutosaving(false);
      }

      await apiFetch(`/submissions/${currentDraftId}/submit`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (user?.id) {
        window.localStorage.removeItem(getDraftStorageKey(user.id));
      }
      router.push(`/submissions/${currentDraftId}`);
    } catch (submitDraftError) {
      setSubmitError(
        submitDraftError instanceof Error
          ? submitDraftError.message
          : "제출 중 오류가 발생했습니다.",
      );
      setIsAutosaving(false);
    }
  }

  if (loading) {
    return <LoadingState title="발명신고 초안" />;
  }

  const shareTotal = sumShares(formState.shares);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
            Draft Composer
          </p>
          <h1 className="font-display text-5xl text-[var(--color-paper)]">
            발명신고 초안 작성
          </h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[#d7cabd]">
          <p>초안 ID: {draftId ?? "아직 없음"}</p>
          <p className="mt-1">
            상태:{" "}
            {creating
              ? "초안 생성 중"
              : isAutosaving
                ? "자동저장 중"
                : isDirty
                  ? "저장 전 변경 있음"
                  : "저장됨"}
          </p>
          <p className="mt-1">
            마지막 저장:{" "}
            {lastSavedAt
              ? new Date(lastSavedAt).toLocaleString("ko-KR")
              : "없음"}
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-[#d18b77]/40 bg-[#5d2a24]/40 px-4 py-3 text-sm text-[#ffd4c4]">
          {error}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-[#d18b77]/40 bg-[#5d2a24]/40 px-4 py-3 text-sm text-[#ffd4c4]">
          {submitError}
        </div>
      ) : null}

      <Panel title="초안 상태" eyebrow="Draft Status" className="max-w-5xl">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2 text-sm text-[#d7cabd]">
            <p>초안은 최초 1회 생성 후 자동저장됩니다.</p>
            <p>필수값, 지분율, 첨부 상태는 제출 전에 즉시 검증됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!draftId ? (
              <button
                type="button"
                disabled={creating}
                onClick={handleManualCreate}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#f3e9dc]"
              >
                {creating ? "초안 생성 중..." : "초안 생성"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={creating || isAutosaving}
              onClick={handleSubmit}
              className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#1d1a17]"
            >
              {isAutosaving ? "저장 중..." : "검토 요청으로 제출"}
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title="제출 전 체크리스트"
        eyebrow="Validation Preview"
        className="max-w-5xl"
      >
        {validationSummary.length === 0 ? (
          <p className="text-sm text-[#d7cabd]">
            현재 입력 기준으로 제출 준비가 되어 있습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {validationSummary.map((section) => (
              <div
                key={section.section}
                className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
              >
                <p className="text-sm font-semibold text-[var(--color-paper)]">
                  {section.section}
                </p>
                <div className="mt-2 space-y-1 text-sm text-[#ffd4c4]">
                  {section.items.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="기본 신고 정보" eyebrow="FORM1" className="max-w-5xl">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명의 명칭(한글) *
            <input
              value={formState.titleKo}
              onChange={(event) => updateForm("titleKo", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명의 명칭(영문)
            <input
              value={formState.titleEn}
              onChange={(event) => updateForm("titleEn", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd] md:col-span-2">
            발명 개요 *
            <textarea
              value={formState.summary}
              onChange={(event) => updateForm("summary", event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            사업부
            <input
              value={formState.businessUnit}
              onChange={(event) =>
                updateForm("businessUnit", event.target.value)
              }
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            출원 희망국 *
            <input
              value={formState.desiredCountries}
              onChange={(event) =>
                updateForm("desiredCountries", event.target.value)
              }
              placeholder="KR, US"
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
        </div>
      </Panel>

      <Panel title="발명자 및 지분" eyebrow="Inventors" className="max-w-5xl">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[#d7cabd]">
          <span>총 지분율</span>
          <span
            className={shareTotal === 100 ? "text-[#cfe6b8]" : "text-[#ffd4c4]"}
          >
            {shareTotal}%
          </span>
        </div>
        <div className="space-y-4">
          {formState.shares.map((share) => (
            <div
              key={share.id}
              className="grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 md:grid-cols-4"
            >
              <label className="grid gap-2 text-sm text-[#d7cabd]">
                발명자명 *
                <input
                  value={share.inventorName}
                  onChange={(event) =>
                    updateForm(
                      "shares",
                      formState.shares.map((row) =>
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
                    updateForm(
                      "shares",
                      formState.shares.map((row) =>
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
                지분율 *
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={share.shareRatio}
                  onChange={(event) =>
                    updateForm(
                      "shares",
                      formState.shares.map((row) =>
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
                    updateForm(
                      "shares",
                      formState.shares.map((row) =>
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
                      updateForm(
                        "shares",
                        formState.shares.map((row) => ({
                          ...row,
                          isPrimary:
                            row.id === share.id ? event.target.checked : false,
                        })),
                      )
                    }
                  />
                  대표 발명자
                </label>
                {formState.shares.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "shares",
                        formState.shares.filter((row) => row.id !== share.id),
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
              updateForm("shares", [
                ...formState.shares,
                {
                  ...createEmptyShare("", ""),
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
            기술분야 *
            <textarea
              value={formState.technicalField}
              onChange={(event) =>
                updateForm("technicalField", event.target.value)
              }
              rows={2}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            배경기술 *
            <textarea
              value={formState.background}
              onChange={(event) => updateForm("background", event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            기술적 과제 *
            <textarea
              value={formState.technicalProblem}
              onChange={(event) =>
                updateForm("technicalProblem", event.target.value)
              }
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            해결수단 *
            <textarea
              value={formState.solvingMeans}
              onChange={(event) =>
                updateForm("solvingMeans", event.target.value)
              }
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            발명의 효과 *
            <textarea
              value={formState.effect}
              onChange={(event) => updateForm("effect", event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-paper)]">
                청구항 *
              </p>
              <button
                type="button"
                onClick={() => updateForm("claims", [...formState.claims, ""])}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f3e9dc]"
              >
                청구항 추가
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {formState.claims.map((claim, index) => (
                <div key={`${index}-${claim}`} className="flex gap-3">
                  <textarea
                    value={claim}
                    onChange={(event) =>
                      updateForm(
                        "claims",
                        formState.claims.map((current, currentIndex) =>
                          currentIndex === index ? event.target.value : current,
                        ),
                      )
                    }
                    rows={2}
                    placeholder={`청구항 ${index + 1}`}
                    className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--color-paper)] outline-none"
                  />
                  {formState.claims.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateForm(
                          "claims",
                          formState.claims.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f3e9dc]"
                    >
                      삭제
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="선행기술 조사" eyebrow="FORM4" className="max-w-5xl">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            기존 특허
            <input
              value={formState.priorPatent}
              onChange={(event) =>
                updateForm("priorPatent", event.target.value)
              }
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            신규성 차이
            <textarea
              value={formState.noveltyDiff}
              onChange={(event) =>
                updateForm("noveltyDiff", event.target.value)
              }
              rows={2}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#d7cabd]">
            진보성 차이
            <textarea
              value={formState.inventiveDiff}
              onChange={(event) =>
                updateForm("inventiveDiff", event.target.value)
              }
              rows={2}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[var(--color-paper)] outline-none"
            />
          </label>
        </div>
      </Panel>

      <Panel
        title="실제 첨부 업로드"
        eyebrow="Required Attachments"
        className="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.values(formState.attachments) as DraftAttachmentState[]).map(
            (attachment) => (
              <label
                key={attachment.key}
                className="grid gap-2 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-[#d7cabd]"
              >
                <span>
                  {attachment.label} {attachment.required ? "*" : ""}
                </span>
                <input
                  type="file"
                  onChange={(event) =>
                    void handleAttachmentUpload(
                      attachment.key,
                      event.target.files?.[0] ?? null,
                    )
                  }
                  className="text-xs text-[#d7cabd]"
                />
                <div className="text-xs text-[#b8aa9b]">
                  상태:{" "}
                  {attachment.uploadStatus === "uploading"
                    ? "업로드 중"
                    : attachment.uploadStatus === "uploaded"
                      ? "업로드 완료"
                      : attachment.uploadStatus === "error"
                        ? "업로드 실패"
                        : "미업로드"}
                </div>
                <div className="min-h-5 text-xs text-[#f3e9dc]">
                  {attachment.fileName || "선택된 파일 없음"}
                </div>
                {attachment.error ? (
                  <div className="text-xs text-[#ffd4c4]">
                    {attachment.error}
                  </div>
                ) : null}
              </label>
            ),
          )}
        </div>
      </Panel>
    </div>
  );
}
