"use client";

/** Leituras por dia nos últimos 14 dias (no fuso do navegador). */
export function ScanChart({ dates }: { dates: string[] }) {
  const days = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d, count: 0 };
  });
  for (const iso of dates) {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - buckets[0].date.getTime()) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx].count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <figure className="w-full border-t border-line pt-3 text-left">
      <figcaption className="mb-2 flex justify-between text-xs text-muted">
        <span>Leituras por dia</span>
        <span className="tabular-nums">{total} em 14 dias</span>
      </figcaption>
      <div className="flex h-20 items-end gap-1" role="img" aria-label={`${total} leituras nos últimos 14 dias`}>
        {buckets.map((b) => (
          <div key={b.date.toISOString()} className="flex h-full flex-1 flex-col justify-end" title={`${b.date.toLocaleDateString("pt-BR")}: ${b.count}`}>
            <div
              className={`w-full rounded-t-sm ${b.count ? "bg-data" : "bg-line"}`}
              style={{ height: b.count ? `${Math.max(8, (b.count / max) * 100)}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{buckets[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
        <span>hoje</span>
      </div>
    </figure>
  );
}
