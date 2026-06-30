export function Placeholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted">
        Dit onderdeel wordt gebouwd in {phase}.
      </div>
    </div>
  );
}
