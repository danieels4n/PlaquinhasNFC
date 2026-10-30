import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurar" };

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-navy">Conecte o Supabase</h1>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-muted">
        <li>Crie um projeto grátis em supabase.com.</li>
        <li>
          No SQL Editor, rode o arquivo <code className="text-ink">supabase/migrations/0001_init.sql</code>.
        </li>
        <li>
          Copie <code className="text-ink">.env.example</code> para <code className="text-ink">.env.local</code> e preencha a URL e a
          chave publishable (Project Settings → API Keys).
        </li>
        <li>Reinicie o servidor (npm run dev).</li>
      </ol>
    </main>
  );
}
