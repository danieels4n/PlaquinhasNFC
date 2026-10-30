"use client";

export function QtyStepper({
  value,
  min,
  max = 1000,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex h-11 items-center rounded-lg border border-line bg-bg">
      <button
        type="button"
        aria-label={`Diminuir ${label}`}
        className="grid h-full w-11 place-items-center text-lg text-muted hover:text-ink disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <input
        aria-label={`Quantidade de ${label}`}
        inputMode="numeric"
        className="h-full w-12 bg-transparent text-center text-[16px] font-medium tabular-nums outline-none"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          if (Number.isFinite(n)) onChange(Math.min(max, n));
        }}
        onBlur={() => value < min && onChange(min)}
      />
      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        className="grid h-full w-11 place-items-center text-lg text-muted hover:text-ink disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        +
      </button>
    </div>
  );
}
