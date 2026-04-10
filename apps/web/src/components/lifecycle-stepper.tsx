import clsx from 'clsx';

import type { LifecycleStep } from '@/lib/types';

export function LifecycleStepper({ steps }: { steps: LifecycleStep[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {steps.map((step, index) => (
        <div key={`${step.key}-${index}`} className="flex items-center gap-3">
          <div
            className={clsx(
              'inline-flex min-w-[104px] rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em]',
              step.status === 'done' &&
                'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30',
              step.status === 'current' &&
                'bg-[var(--color-accent)] text-[#1d1a17]',
              step.status === 'pending' &&
                'bg-white/5 text-[#cbbcae] ring-1 ring-inset ring-white/10',
            )}
          >
            {step.label}
          </div>
          {index < steps.length - 1 ? (
            <div className="hidden h-px w-8 bg-white/10 md:block" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

