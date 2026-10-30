import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { hasPlacesKey } from "@/lib/google-review";
import { ReviewTool } from "./review-tool";

export const metadata: Metadata = { title: "Link de avaliação Google" };

export default function ReviewLinkPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Ferramenta"
        title="Link de avaliação Google"
        subtitle="Gere o link que abre direto a tela de avaliar a empresa. Depois, cole-o como destino da plaquinha."
      />
      <ReviewTool searchEnabled={hasPlacesKey()} />
    </div>
  );
}
