"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Product } from "@/lib/products";
import { saveProduct } from "./actions";

const money = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));

export function ProductForm({ product }: { product?: Product }) {
  const [image, setImage] = useState(product?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function upload(file: File) {
    setUploadError("");
    if (!file.type.startsWith("image/")) return setUploadError("Escolha uma imagem.");
    if (file.size > 3 * 1024 * 1024) return setUploadError("A imagem deve ter até 3 MB.");
    setUploading(true);
    const supabase = createBrowserSupabase();
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(`Falha no envio: ${error.message}`);
    setImage(supabase.storage.from("products").getPublicUrl(path).data.publicUrl);
  }

  return (
    <ActionForm action={saveProduct} className="card space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="image_url" value={image} />

      <div>
        <p className="label">Foto</p>
        <div className="flex items-center gap-3">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-20 rounded-lg bg-surface-2 object-cover" />
          ) : (
            <div className="grid size-20 place-items-center rounded-lg bg-surface-2 text-xs text-muted">Sem foto</div>
          )}
          <div className="space-y-2">
            <label className="btn-ghost cursor-pointer">
              {uploading ? "Enviando…" : image ? "Trocar foto" : "Enviar foto"}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {image && (
              <button type="button" className="block text-xs text-danger" onClick={() => setImage("")}>Remover foto</button>
            )}
          </div>
        </div>
        {uploadError && <p className="mt-2 text-sm text-danger">{uploadError}</p>}
      </div>

      <div>
        <label htmlFor="name" className="label">Nome</label>
        <input id="name" name="name" required maxLength={120} defaultValue={product?.name} className="input" />
      </div>
      <div>
        <label htmlFor="description" className="label">Descrição</label>
        <textarea id="description" name="description" rows={3} maxLength={4000} defaultValue={product?.description} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="size_label" className="label">Tamanho</label>
          <input id="size_label" name="size_label" defaultValue={product?.size_label} className="input" placeholder="10 × 10 cm" />
        </div>
        <div>
          <label htmlFor="badge" className="label">Selo (opcional)</label>
          <input id="badge" name="badge" maxLength={30} defaultValue={product?.badge} className="input" placeholder="NOVO" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="price" className="label">Preço por unidade (R$)</label>
          <input id="price" name="price" required inputMode="decimal" defaultValue={money(product?.price_cents)} className="input" placeholder="12,90" />
        </div>
        <div>
          <label htmlFor="promo_price" className="label">Preço promocional (R$)</label>
          <input id="promo_price" name="promo_price" inputMode="decimal" defaultValue={money(product?.promo_price_cents)} className="input" placeholder="opcional" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="min_qty" className="label">Qtd. mínima</label>
          <input id="min_qty" name="min_qty" inputMode="numeric" defaultValue={product?.min_qty ?? 5} className="input" />
        </div>
        <div>
          <label htmlFor="stock" className="label">Estoque</label>
          <input id="stock" name="stock" inputMode="numeric" defaultValue={product?.stock ?? ""} className="input" placeholder="ilimitado" />
        </div>
        <div>
          <label htmlFor="weight_g" className="label">Peso (g/un.)</label>
          <input id="weight_g" name="weight_g" inputMode="numeric" defaultValue={product?.weight_g ?? 60} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <div>
          <label htmlFor="sort" className="label">Ordem na loja</label>
          <input id="sort" name="sort" inputMode="numeric" defaultValue={product?.sort ?? 0} className="input" />
        </div>
        <label className="flex h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-5 accent-[var(--color-accent)]" />
          À venda
        </label>
      </div>
      <SubmitButton>{product ? "Salvar produto" : "Criar produto"}</SubmitButton>
    </ActionForm>
  );
}
