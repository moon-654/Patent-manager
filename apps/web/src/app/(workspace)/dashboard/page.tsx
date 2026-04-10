'use client';

import { useEffect, useState } from 'react';

import { Panel } from '@/components/panel';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { apiFetch } from '@/lib/api';
import { useSession } from '@/components/session-provider';
import type {
  DashboardHealth,
  Notification,
  PatentSummary,
  PolicySummary,
  RewardSummary,
  SubmissionSummary,
} from '@/lib/types';

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('ko-KR') : '-';
}

export default function DashboardPage() {
  const { user } = useSession();
  const [health, setHealth] = useState<DashboardHealth | null>(null);
  const [report, setReport] = useState<Record<string, string | number> | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [patents, setPatents] = useState<PatentSummary[]>([]);
  const [rewards, setRewards] = useState<RewardSummary[]>([]);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        const [
          healthData,
          reportData,
          notificationData,
          submissionData,
          patentData,
          rewardData,
          policyData,
        ] = await Promise.all([
          apiFetch<DashboardHealth>('/health'),
          apiFetch<Record<string, string | number>>('/reports/operations'),
          apiFetch<Notification[]>('/my/notifications'),
          apiFetch<SubmissionSummary[]>('/submissions'),
          apiFetch<PatentSummary[]>('/patents'),
          apiFetch<RewardSummary[]>('/rewards'),
          apiFetch<PolicySummary[]>('/policies'),
        ]);

        if (!active) {
          return;
        }

        setHealth(healthData);
        setReport(reportData);
        setNotifications(notificationData);
        setSubmissions(submissionData);
        setPatents(patentData);
        setRewards(rewardData);
        setPolicies(policyData);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : '대시보드 데이터를 불러오지 못했습니다.',
        );
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

  const primaryRole = user?.roles[0]?.code ?? 'INVENTOR';
  const mySubmissions = submissions.filter((item) => item.submitterName === user?.name);
  const myRewards = rewards.filter((item) => item.ownerName.includes(user?.name ?? ''));
  const urgentSubmissions = submissions.filter(
    (item) => item.currentStatus !== 'ACCEPTED' && item.currentStatus !== 'REJECTED',
  );
  const pendingOa = patents.filter((item) => item.oaPending);
  const pendingRewards = rewards.filter((item) => item.currentStatus !== 'PAID');
  const activePolicy = policies.find((item) => item.currentStatus === 'ACTIVE');

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
            Operations Desk
          </p>
          <h1 className="font-display text-5xl text-[var(--color-paper)]">
            지금 처리해야 할 일부터 보이는 대시보드
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[#d7cabd]">
          현재 역할 기준으로 병목, 기한, 최근 변경, 다음 액션을 먼저 보여주는 업무형 첫 화면입니다.
        </p>
      </header>

      {error ? <ErrorState message={error} /> : null}

      {loading ? <LoadingState title="대시보드" /> : null}

      {!loading ? (
        <>
          <div className="data-grid">
            <Panel title="오늘 처리 필요" eyebrow="Action Queue">
              <p className="text-4xl font-semibold text-[var(--color-paper)]">
                {primaryRole === 'INVENTOR'
                  ? mySubmissions.length + myRewards.length
                  : urgentSubmissions.length + pendingRewards.length}
              </p>
              <p className="mt-3 text-sm text-[#c6b6a7]">
                {primaryRole === 'INVENTOR'
                  ? '내 신고/보상 기준'
                  : '운영 큐 기준'}
              </p>
            </Panel>
            <Panel title="기한 임박 건" eyebrow="Deadlines">
              <p className="text-4xl font-semibold text-[var(--color-paper)]">
                {primaryRole === 'INVENTOR' ? mySubmissions.length : pendingOa.length}
              </p>
              <p className="mt-3 text-sm text-[#c6b6a7]">
                {primaryRole === 'INVENTOR' ? '내 신고 추적' : 'OA 대응 및 승계'}
              </p>
            </Panel>
            <Panel title="현재 적용 정책" eyebrow="Policy">
              <p className="text-3xl font-semibold text-[var(--color-paper)]">
                {activePolicy?.versionCode ?? '-'}
              </p>
              <p className="mt-3 text-sm text-[#c6b6a7]">
                {activePolicy?.currentStatusLabel ?? '정책 정보 없음'}
              </p>
            </Panel>
            <Panel title="서비스 상태" eyebrow="Runtime">
              <p className="text-4xl font-semibold text-[var(--color-paper)]">
                {health?.status ?? '...'}
              </p>
              <p className="mt-3 text-sm text-[#c6b6a7]">
                {report?.activePolicy ?? health?.service}
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel title="역할별 우선순위" eyebrow={primaryRole}>
              <div className="space-y-4">
                {primaryRole === 'INVENTOR' ? (
                  <>
                    {mySubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-soft)]">
                              {submission.submissionNo}
                            </p>
                            <h3 className="mt-2 text-lg text-[var(--color-paper)]">
                              {submission.title}
                            </h3>
                          </div>
                          <StatusBadge value={submission.currentStatus} />
                        </div>
                        <p className="mt-3 text-sm text-[#d0c2b4]">
                          현재 단계 {submission.currentStatusLabel} · 다음 액션{' '}
                          {submission.nextAction}
                        </p>
                      </div>
                    ))}
                    {mySubmissions.length === 0 ? (
                      <EmptyState
                        title="내 신고 건이 없습니다"
                        description="새 신고를 작성하면 여기서 진행 상태를 바로 확인할 수 있습니다."
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    {urgentSubmissions.slice(0, 3).map((submission) => (
                      <div
                        key={submission.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-soft)]">
                              {submission.submissionNo}
                            </p>
                            <h3 className="mt-2 text-lg text-[var(--color-paper)]">
                              {submission.title}
                            </h3>
                          </div>
                          <StatusBadge value={submission.currentStatus} />
                        </div>
                        <p className="mt-3 text-sm text-[#d0c2b4]">
                          담당 {submission.submitterName} · 기한 {formatDate(submission.dueDate)} · 다음 액션{' '}
                          {submission.nextAction}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Panel>

            <Panel title="최근 변경과 알림" eyebrow="Signal Feed">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className="rounded-3xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[var(--color-paper)]">
                        {notification.title}
                      </h3>
                      <StatusBadge value={notification.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#d0c2b4]">
                      {notification.body}
                    </p>
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="승계/접수 큐" eyebrow="Submissions">
              <div className="space-y-3">
                {submissions.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--color-paper)]">{item.title}</span>
                      <StatusBadge value={item.currentStatus} />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8f7f6f]">
                      {item.nextAction}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="특허/OA 병목" eyebrow="Patent Ops">
              <div className="space-y-3">
                {patents.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--color-paper)]">
                        {item.applicationNo}
                      </span>
                      <StatusBadge value={item.currentStatus} />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8f7f6f]">
                      {item.nextAction}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="보상 처리 큐" eyebrow="Reward Ops">
              <div className="space-y-3">
                {rewards.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--color-paper)]">{item.rewardNo}</span>
                      <StatusBadge value={item.currentStatus} />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8f7f6f]">
                      {item.paymentProgress} · {item.nextAction}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
