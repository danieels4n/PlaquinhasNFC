/**
 * Gráficos em SVG puro, sem biblioteca: uma série, um matiz (azul dos dados), barras de canto reto,
 * 3-4 linhas de grade cinza, escala redonda acima do máximo, rótulos do eixo X sem rotação.
 */

function niceMax(max: number) {
  if (max <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    const top = Math.ceil(max / (step * m)) * step * m;
    if (top / (step * m) <= 4) return top;
  }
  return Math.ceil(max / step) * step;
}

export type BarPoint = { label: string; value: number; highlight?: boolean };

/** Colunas por dia. A última (hoje) pode vir destacada; as demais seguem o mesmo azul, mais claro. */
export function DailyBars({ points, height = 160, width = 600, labels = 5, unit = "leituras" }: { points: BarPoint[]; height?: number; width?: number; labels?: number; unit?: string }) {
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max].filter((t, i, a) => Number.isInteger(t) && a.indexOf(t) === i);
  const W = width;
  const H = height;
  const left = 28;
  const bottom = 22;
  const plotW = W - left;
  const plotH = H - bottom - 6;
  const slot = plotW / points.length;
  const barW = Math.max(4, Math.min(28, slot * 0.62));
  const y = (v: number) => 6 + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(points.length / labels));
  const total = points.reduce((s, p) => s + p.value, 0);
  // id único por instância: a versão de celular fica oculta no computador, e um gradiente
  // dentro de um trecho oculto não pinta as barras da outra versão.
  const gradId = `bar-blue-${W}x${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${total} ${unit} no período`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b7bff" />
          <stop offset="100%" stopColor="#0f47bf" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--color-control)" : "var(--color-rule)"} strokeWidth={1} />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" className="tabular-nums">
            {t}
          </text>
        </g>
      ))}
      {points.map((p, i) => {
        const x = left + i * slot + (slot - barW) / 2;
        const h = (p.value / max) * plotH;
        const showLabel = (points.length - 1 - i) % labelEvery === 0;
        return (
          <g key={i}>
            {p.value > 0 && (
              <rect x={x} y={y(p.value)} width={barW} height={h} fill={`url(#${gradId})`} rx={Math.min(4, barW / 3)} opacity={p.highlight === false ? 0.45 : 1}>
                <title>{`${p.label}: ${p.value} ${unit}`}</title>
              </rect>
            )}
            {showLabel && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Lista ranqueada com barra fina proporcional sob o rótulo; o primeiro em tinta, os demais em cinza. */
export function ThinBar({ value, max, first }: { value: number; max: number; first: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="mt-1.5 block h-[3px] w-full rounded-full bg-rule" aria-hidden>
      <span className={`block h-full rounded-full ${first ? "bg-accent" : "bg-[#b9cdf5]"}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
