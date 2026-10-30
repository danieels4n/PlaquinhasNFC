import { Suspense } from "react";
import type { Metadata } from "next";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, PageSkeleton, formatDate } from "@/components/ui";
import type { ActionState } from "@/lib/types";

export const metadata: Metadata = { title: "Usuários" };

const ROLES = [
  { value: "user", label: "Revendedor" },
  { value: "supplier", label: "Fornecedor" },
  { value: "admin", label: "Administrador" },
];

async function setRole(_: ActionState, formData: FormData): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user: String(formData.get("user_id") ?? ""),
    p_role: String(formData.get("role") ?? ""),
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Papel atualizado." };
}

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/mais" eyebrow="Administrador" title="Usuários" subtitle="Defina quem é fornecedor ou administrador." />
      <Suspense fallback={<PageSkeleton />}>
        <Users />
      </Suspense>
    </div>
  );
}

async function Users() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, name, email, role, created_at").order("created_at", { ascending: false }).limit(200);

  return (
    <ul className="space-y-3">
      {(data ?? []).map((u) => (
        <li key={u.id} className="card">
          <p className="truncate font-medium">{u.name || "Sem nome"}</p>
          <p className="truncate text-xs text-muted">{u.email} · desde {formatDate(u.created_at)}</p>
          {u.id === me.id ? (
            <p className="mt-2 text-xs text-muted">Você (administrador)</p>
          ) : (
            <ActionForm action={setRole} className="mt-3 flex gap-2">
              <input type="hidden" name="user_id" value={u.id} />
              <select name="role" defaultValue={u.role} aria-label={`Papel de ${u.name || u.email}`} className="input">
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <SubmitButton className="btn-ghost shrink-0" pendingText="…">Salvar</SubmitButton>
            </ActionForm>
          )}
        </li>
      ))}
    </ul>
  );
}
