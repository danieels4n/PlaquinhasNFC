"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import type { ActionState } from "@/lib/types";

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada." };
    return { error: "E-mail ou senha incorretos." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signup(_: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email) return { error: "Preencha nome e e-mail." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${siteUrl()}/auth/confirm?next=/` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Já existe uma conta com este e-mail." };
    return { error: error.message };
  }
  if (data.session) redirect("/");
  return { ok: "Conta criada! Enviamos um link de confirmação para o seu e-mail." };
}

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe o e-mail." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/nova-senha` });
  // Mesma resposta exista ou não a conta, para não revelar quem tem cadastro.
  return { ok: "Se houver uma conta com este e-mail, você vai receber o link em instantes." };
}

export async function setNewPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== formData.get("confirm")) return { error: "As senhas não são iguais." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "O link expirou. Peça um novo em “Esqueci minha senha”." };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
