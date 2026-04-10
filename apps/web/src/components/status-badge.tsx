import clsx from "clsx";

const toneMap: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  PAID: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  SUBMITTED: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  UNDER_REVIEW: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  DRAFT: "bg-zinc-500/15 text-zinc-200 ring-zinc-500/30",
  OA: "bg-orange-500/15 text-orange-200 ring-orange-500/30",
  CALCULATED: "bg-indigo-500/15 text-indigo-200 ring-indigo-500/30",
  APPROVAL_WAITING: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
  EXPIRED: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ring-1 ring-inset",
        toneMap[value] ?? "bg-stone-500/15 text-stone-100 ring-stone-500/30",
      )}
    >
      {value}
    </span>
  );
}

