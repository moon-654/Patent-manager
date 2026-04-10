import clsx from 'clsx';

import type { TimelineItem } from '@/lib/types';

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="grid grid-cols-[14px_1fr] gap-4">
          <div className="flex flex-col items-center">
            <span
              className={clsx(
                'mt-1 size-3 rounded-full',
                item.tone === 'success' && 'bg-emerald-400',
                item.tone === 'warning' && 'bg-amber-400',
                (!item.tone || item.tone === 'neutral') && 'bg-[#b78f61]',
              )}
            />
            <span className="mt-2 h-full w-px bg-white/10" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-[var(--color-paper)]">
                {item.title}
              </h4>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8f7f6f]">
                {new Date(item.timestamp).toLocaleString('ko-KR')}
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#d5c8bb]">
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

