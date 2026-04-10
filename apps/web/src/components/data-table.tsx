import clsx from 'clsx';

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectedKey,
  onSelect,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (item: T) => string;
  selectedKey?: string;
  onSelect?: (item: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#171310]/70">
      <div className="grid grid-cols-1 gap-px bg-white/5">
        <div className="hidden grid-cols-[1.2fr_1.4fr_repeat(4,minmax(0,1fr))] gap-px bg-white/5 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#bca78d] lg:grid">
          {columns.map((column) => (
            <div key={column.key} className={column.className}>
              {column.header}
            </div>
          ))}
        </div>
        {rows.map((row) => {
          const key = rowKey(row);
          const selected = selectedKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect?.(row)}
              className={clsx(
                'grid w-full grid-cols-1 gap-3 border-t border-white/5 px-4 py-4 text-left transition lg:grid-cols-[1.2fr_1.4fr_repeat(4,minmax(0,1fr))] lg:items-center',
                selected
                  ? 'bg-[var(--color-accent)]/10'
                  : 'bg-transparent hover:bg-white/5',
              )}
            >
              {columns.map((column) => (
                <div key={column.key} className={column.className}>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-[#8f7f6f] lg:hidden">
                    {column.header}
                  </div>
                  {column.render(row)}
                </div>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

