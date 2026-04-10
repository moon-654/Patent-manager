export function LoadingState({ title }: { title: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-10 text-center text-[#d8cbbe]">
      {title} 불러오는 중입니다.
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/15 bg-black/10 px-5 py-10 text-center">
      <h3 className="font-display text-3xl text-[var(--color-paper)]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#d0c4b7]">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 px-5 py-6 text-sm text-rose-100">
      {message}
    </div>
  );
}
