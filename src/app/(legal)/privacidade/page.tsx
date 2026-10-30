import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade" };

// MODELO — revise com um advogado e preencha o encarregado (DPO) e contato antes de publicar.
export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="rounded-lg border border-[#fde68a] bg-warn-bg p-3 text-warn">
        Modelo de política. Revise com um advogado e complete os dados da empresa antes de publicar.
      </p>
      <h2>Dados que coletamos</h2>
      <p>
        Conta: nome, e-mail e senha (guardada de forma criptografada). Compras: nome de quem recebe, telefone, CPF ou CNPJ e endereço
        de entrega. Plaquinhas: clientes cadastrados por você, destinos configurados e a data de cada leitura.
      </p>
      <p>Quem escaneia uma plaquinha não precisa se cadastrar; registramos apenas a data e a hora da leitura.</p>
      <h2>Para que usamos</h2>
      <p>Para manter sua conta, processar pagamentos (Mercado Pago), calcular e despachar o frete (Melhor Envio/transportadoras) e mostrar estatísticas das suas plaquinhas.</p>
      <h2>Compartilhamento</h2>
      <p>Compartilhamos apenas o necessário com o processador de pagamento, a transportadora e o fornecedor que produz o seu pedido. Não vendemos dados.</p>
      <h2>Seus direitos (LGPD)</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados pelo contato abaixo. Alguns dados de compra são mantidos pelo prazo exigido em lei.</p>
      <h2>Contato do encarregado</h2>
      <p>[Nome do encarregado] · [e-mail]</p>
    </>
  );
}
