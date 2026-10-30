import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Chevron, KpiCard, PageSkeleton, PlateCode, StarIcon, formatBRL } from "@/components/ui";
import { DailyBars, ThinBar } from "@/components/charts";
import { GettingStarted, type Step } from "@/components/getting-started";
import { Welcome } from "@/components/welcome";
import type { Plate } from "@/lib/types";
import { ORDER_STATUS_LABEL, orderNumber, type Order } from "@/lib/orders";

export const metadata: Metadata = { title: "Resumo" };

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

const DAY = 86_400_000;
/** Dia local de Brasília (UTC-3) no formato AAAA-MM-DD. */
const dayKey = (t: number) => new Date(t - 3 * 3600_000).toISOString().slice(0, 10);

type PlateRow = Pick<Plate, "id" | "code" | "status" | "scans" | "sale_value" | "nickname"> & { customers: { name: string } | null };
type CustomerRow = { id: string; name: string; google_rating: number | null; google_reviews: number | null; google_baseline_reviews: number | null };

async function Dashboard() {
  const user = await requireUser();
  if (user.isSupplier) redirect("/fornecedor");

  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - 28 * DAY).toISOString();

  const [{ data: platesData }, { count: reserved }, { data: openOrders }, { data: customersData }, { count: customerCount }, { count: linkedCount }, { data: scanRows }] = await Promise.all([
    supabase.from("plates").select("id, code, status, scans, sale_value, nickname, customers(name)").eq("owner_id", user.id),
    supabase.from("plates").select("id", { count: "exact", head: true }).eq("reserved_for", user.id).is("owner_id", null),
    supabase
      .from("orders")
      .select("id, number, status")
      .eq("buyer_id", user.id)
      .in("status", ["awaiting_payment", "paid", "in_production", "ready", "shipped"])
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("customers")
      .select("id, name, google_rating, google_reviews, google_baseline_reviews")
      .eq("archived", false)
      .eq("stage", "client")
      .not("google_place_id", "is", null),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("customers").select("id", { count: "exact", head: true }).not("google_place_id", "is", null),
    // Leituras das plaquinhas desta conta, na mesma rodada das outras consultas (antes era uma ida a mais)
    supabase.from("plate_scans").select("scanned_at, plates!inner(owner_id)").eq("plates.owner_id", user.id).gte("scanned_at", since).limit(20000),
  ]);
  const onboarding = user.onboarding;

  const plates = (platesData ?? []) as unknown as PlateRow[];
  const orders = (openOrders ?? []) as Pick<Order, "id" | "number" | "status">[];

  // Leituras por dia: 14 dias atuais (gráfico) e os 14 anteriores (comparação em palavras)
  const perDay = new Map<string, number>();
  for (const r of scanRows ?? []) {
    const k = dayKey(new Date(r.scanned_at as string).getTime());
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const days = Array.from({ length: 14 }, (_, i) => now - (13 - i) * DAY);
  const points = days.map((t, i) => ({
    label: i === 13 ? "hoje" : new Date(t - 3 * 3600_000).toISOString().slice(8, 10) + "/" + new Date(t - 3 * 3600_000).toISOString().slice(5, 7),
    value: perDay.get(dayKey(t)) ?? 0,
  }));
  const last14 = points.reduce((s, p) => s + p.value, 0);
  const prev14 = Array.from({ length: 14 }, (_, i) => perDay.get(dayKey(now - (27 - i) * DAY)) ?? 0).reduce((a, b) => a + b, 0);
  const diff = last14 - prev14;

  const active = plates.filter((p) => p.status === "active").length;
  const pending = plates.filter((p) => p.status === "pending").length;
  const sold = plates.filter((p) => p.sale_value != null);
  const revenue = sold.reduce((sum, p) => sum + Number(p.sale_value ?? 0), 0);

  // Resultado dos clientes: avaliações ganhas desde o vínculo, maior primeiro
  const results = ((customersData ?? []) as CustomerRow[])
    .map((c) => ({ ...c, gained: c.google_reviews !== null && c.google_baseline_reviews !== null ? c.google_reviews - c.google_baseline_reviews : 0 }))
    .sort((a, b) => b.gained - a.gained)
    .slice(0, 5);
  const maxGained = Math.max(0, ...results.map((r) => r.gained));
  const topPlates = [...plates].filter((p) => p.scans > 0).sort((a, b) => b.scans - a.scans).slice(0, 5);

  // A tarefa mais urgente vira a linha de apoio do título
  type Todo = { href: string; title: string; text: string };
  const todos: Todo[] = [];
  for (const o of orders.filter((o) => o.status === "awaiting_payment")) {
    todos.push({ href: `/pedidos/${o.id}`, title: `Pagar o pedido ${orderNumber(o.number)}`, text: "Pix gerado, aguardando pagamento" });
  }
  if ((reserved ?? 0) > 0) {
    todos.push({ href: "/plaquinhas", title: `Ativar ${reserved} plaquinhas compradas`, text: "Escaneie o QR de cada uma quando chegar" });
  }
  if (pending > 0) {
    todos.push({ href: "/plaquinhas?status=pending", title: `Definir o destino de ${pending} ${pending === 1 ? "plaquinha" : "plaquinhas"}`, text: "Sem destino, ninguém é redirecionado" });
  }
  for (const o of orders.filter((o) => o.status !== "awaiting_payment")) {
    todos.push({ href: `/pedidos/${o.id}`, title: `Pedido ${orderNumber(o.number)}`, text: ORDER_STATUS_LABEL[o.status] });
  }

  const finding = todos[0]
    ? todos[0].title
    : last14 > 0
      ? `${last14} ${last14 === 1 ? "leitura" : "leituras"} nos últimos 14 dias`
      : "Tudo em dia";

  const firstRun = plates.length === 0 && !orders.length && !(reserved ?? 0);

  // Primeiros passos: cada um se marca sozinho pelos dados da conta
  const totalScans = plates.reduce((sum, p) => sum + p.scans, 0);
  const steps: Step[] = [
    { key: "plate", title: "Comprar ou ativar a primeira plaquinha", text: "Compre um lote na loja ou escaneie o QR de uma plaquinha", href: plates.length || reserved ? "/plaquinhas" : "/loja", done: plates.length > 0 || (reserved ?? 0) > 0 || orders.length > 0 },
    { key: "destination", title: "Definir o destino", text: "Escolha para onde ela leva: Google, WhatsApp, Instagram…", href: "/plaquinhas", done: active > 0 },
    { key: "customer", title: "Cadastrar o primeiro cliente", text: "A empresa onde a plaquinha vai ficar", href: "/clientes", done: (customerCount ?? 0) > 0 },
    { key: "scan", title: "Receber a primeira leitura", text: "Encoste o celular numa plaquinha ativa para testar", href: "/plaquinhas", done: totalScans > 0 },
    { key: "google", title: "Vincular um cliente ao Google", text: "Para acompanhar as avaliações que ele ganha", href: "/clientes", done: (linkedCount ?? 0) > 0 },
  ];
  const allDone = steps.every((st) => st.done);
  // Sem a coluna de avisos (SQL 0004 pendente), mostra só enquanto houver passos a fazer
  const showSteps = onboarding ? !onboarding.checklist_done && !onboarding.checklist_hidden : !allDone;
  const showWelcome = onboarding !== null && !onboarding.welcome;

  return (
    <>
      {/* A. Saudação */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Olá, {user.name.split(" ")[0]}! <span className="wave" aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Acompanhe suas vendas e ativações.</p>
      </header>

      {/* B. Ação principal (Ativar) e a secundária (Comprar), sem competir */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link href="/plaquinhas" className="btn-primary h-14 w-full gap-2.5 text-base sm:w-auto sm:px-7">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z" />
          </svg>
          Ativar plaquinha
        </Link>
        <Link href="/loja" className="btn h-11 text-accent hover:bg-raised sm:ml-1">Comprar plaquinhas</Link>
      </div>

      {showWelcome && <Welcome />}
      {showSteps && <GettingStarted steps={steps} canHide={onboarding !== null} />}

      {/* Próxima tarefa, quando houver (o mesmo dado de antes) */}
      {todos[0] && (
        <Link href={todos[0].href} className="card-press mb-5 flex items-center justify-between gap-3 rounded-2xl bg-raised px-4 py-3 text-sm">
          <span className="min-w-0">
            <span className="block font-semibold text-navy">{finding}</span>
            <span className="block truncate text-xs text-muted">{todos[0].text}</span>
          </span>
          <Chevron />
        </Link>
      )}

      {firstRun && showSteps ? null : firstRun ? (
        <section className="card">
          <h2 className="text-base font-semibold">Comece pela primeira plaquinha</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Compre um lote na loja ou, se já tem uma plaquinha em mãos, aponte a câmera do celular para o QR dela.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/loja" className="btn-primary">Comprar plaquinhas</Link>
            <Link href="/prospeccao" className="btn-ghost">Buscar clientes</Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <section aria-label="Números" className="grid grid-cols-3 gap-3 lg:col-span-12">
            <KpiCard icon="bolt" label="Ativas" value={active} hint={`de ${plates.length} plaquinhas`} />
            <KpiCard icon="bars" label="Leituras" value={last14} hint={prev14 || last14 ? `14 dias · ${diff >= 0 ? "+" : ""}${diff}` : "14 dias"} />
            <KpiCard icon="money" label="Vendido" value={formatBRL(revenue)} muted={revenue === 0} hint={`${sold.length} ${sold.length === 1 ? "venda" : "vendas"}`} />
          </section>

          <section className="card lg:col-span-7">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">Leituras por dia</h2>
              <span className="text-xs text-muted">últimos 14 dias</span>
            </div>
            <div className="md:hidden"><DailyBars points={points} width={340} labels={4} /></div>
            <div className="hidden md:block"><DailyBars points={points} width={640} labels={7} /></div>
            {last14 === 0 && <p className="mt-2 text-sm text-muted">Nenhuma leitura no período. Assim que alguém tocar numa plaquinha, ela aparece aqui.</p>}
          </section>

          <section className="card flex flex-col lg:col-span-5">
            <h2 className="mb-1 text-base font-semibold">Para fazer</h2>
            {todos.length ? (
              <ul className="divide-y divide-rule">
                {todos.slice(0, 5).map((t) => (
                  <li key={t.href + t.title}>
                    <Link href={t.href} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.title}</span>
                        <span className="block truncate text-xs text-muted">{t.text}</span>
                      </span>
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">Tudo em dia: nenhum pedido ou plaquinha esperando por você.</p>
            )}
            <div className="mt-auto flex gap-4 border-t border-rule pt-3 text-xs">
              <Link href="/pedidos" className="link">Meus pedidos</Link>
              <Link href="/prospeccao" className="link">Buscar clientes</Link>
            </div>
          </section>

          <section className="card lg:col-span-7">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">Resultado dos clientes</h2>
              <Link href="/clientes" className="link text-xs">Ver clientes</Link>
            </div>
            <p className="mb-2 text-xs text-muted">Avaliações no Google ganhas desde que a empresa foi vinculada</p>
            {results.length ? (
              <ul>
                {results.map((r, i) => (
                  <li key={r.id}>
                    <Link href={`/clientes/${r.id}`} className="-mx-2 block rounded-md px-2 py-2.5 hover:bg-surface-2">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{r.name}</span>
                        <span className="shrink-0 text-sm tabular-nums">
                          <span className={r.gained > 0 ? "font-medium text-data" : "text-muted"}>{r.gained > 0 ? `+${r.gained}` : r.gained}</span>
                          <span className="text-muted"> aval. · <StarIcon /> {r.google_rating !== null ? Number(r.google_rating).toFixed(1).replace(".", ",") : "—"}</span>
                        </span>
                      </span>
                      <ThinBar value={r.gained} max={maxGained} first={i === 0 && r.gained > 0} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-control px-3 py-3 text-sm text-muted">
                Vincule seus clientes ao Google para mostrar quantas avaliações cada um ganhou.{" "}
                <Link href="/clientes" className="link">Abrir clientes</Link>
              </p>
            )}
          </section>

          <section className="card lg:col-span-5">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">Mais lidas</h2>
              <Link href="/plaquinhas" className="link text-xs">Todas</Link>
            </div>
            {topPlates.length ? (
              <ul className="divide-y divide-rule">
                {topPlates.map((p) => (
                  <li key={p.id}>
                    <Link href={`/plaquinhas/${p.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-surface-2">
                      <span className="min-w-0">
                        <PlateCode code={p.code} />
                        <span className="block truncate text-xs text-muted">{p.nickname || p.customers?.name || "Sem cliente"}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-medium tabular-nums">{p.scans}</span>
                        <span className="block text-xs text-muted">leituras</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">Nenhuma plaquinha foi lida ainda.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
