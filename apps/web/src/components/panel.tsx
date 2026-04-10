import clsx from "clsx";

export function Panel({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-[28px] border border-white/10 bg-[#14110f]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur",
        className,
      )}
    >
      <div className="mb-5">
        {eyebrow ? (
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-[var(--color-accent-soft)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-2xl text-[var(--color-paper)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

