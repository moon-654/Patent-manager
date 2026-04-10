export function SplitDetailPane({
  list,
  detail,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>{list}</div>
      <div>{detail}</div>
    </div>
  );
}

