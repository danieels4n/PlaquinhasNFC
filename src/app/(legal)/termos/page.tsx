import type { Metadata } from "next";
import { APP_NAME } from "@/lib/env";

export const metadata: Metadata = { title: "Termos de uso" };

// MODELO — revise com um advogado e preencha razão social, CNPJ e contato antes de publicar.
export default function TermsPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="rounded-lg border border-[#fde68a] bg-warn-bg p-3 text-warn">
        Modelo de termos. Revise com um advogado e complete os dados da empresa antes de publicar.
      </p>
      <h2>1. O serviço</h2>
      <p>
        O {APP_NAME} permite comprar plaquinhas com chip NFC e QR Code, ativá-las e escolher para onde cada uma direciona
        (por exemplo, a página de avaliação de uma empresa no Google).
      </p>
      <h2>2. Conta</h2>
      <p>Você é responsável pelos dados informados e pela segurança da sua senha. Uma plaquinha ativada pertence à conta que a ativou.</p>
      <h2>3. Compras, pagamento e entrega</h2>
      <p>
        Os preços, quantidades mínimas e o frete são exibidos antes do pagamento. O pedido entra em produção após a confirmação do
        pagamento. O prazo de entrega informado pela transportadora é uma estimativa.
      </p>
      <h2>4. Arrependimento e trocas</h2>
      <p>
        Nas compras pela internet, o consumidor pode desistir em até 7 dias do recebimento (art. 49 do Código de Defesa do Consumidor).
        Produtos com defeito de fabricação serão trocados.
      </p>
      <h2>5. Uso adequado</h2>
      <p>É proibido direcionar plaquinhas para conteúdo ilegal, enganoso ou que viole direitos de terceiros. Podemos desativar plaquinhas usadas dessa forma.</p>
      <h2>6. Disponibilidade</h2>
      <p>Trabalhamos para manter o redirecionamento sempre no ar, mas podem ocorrer interrupções por manutenção ou falhas de terceiros.</p>
      <h2>7. Contato</h2>
      <p>[Razão social] · CNPJ [00.000.000/0000-00] · [e-mail de contato]</p>
    </>
  );
}
