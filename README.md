# PlacaLink

App para revendedores de plaquinhas NFC + QR Code: ativar plaquinhas, apontar cada uma para um destino
(avaliação no Google, WhatsApp, Instagram, site…), organizar clientes e acompanhar as leituras.

Stack: Next.js 16 (App Router, Cache Components) · Supabase (login + Postgres) · Tailwind CSS 4.

## Como funciona

1. O **admin** gera um lote em *Mais → Lotes*. Cada plaquinha ganha um código (`PL-01001`) e um link
   permanente `SEU_SITE/q/ABCD2345`.
2. O admin imprime os QR Codes e grava o mesmo link nos chips NFC (CSV para gravação em lote).
3. O **revendedor** escaneia o QR com a câmera → abre `/ativar` → a plaquinha entra na conta dele.
4. Ele escolhe cliente e destino e marca como *Ativa*.
5. Quem encosta o celular ou escaneia o QR passa por `/q/...`, a leitura é contada e a pessoa é redirecionada.

## Rodando

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/migrations/0001_init.sql`.
3. `cp .env.example .env.local` e preencha a URL e a chave publishable.
4. Em *Authentication → URL Configuration*, coloque seu endereço em **Site URL** e adicione
   `SEU_SITE/auth/confirm` em **Redirect URLs**.
5. `npm install` e `npm run dev` → http://localhost:3000

### Tornar sua conta administradora

Crie a conta pelo app e rode no SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'seu@email.com');
```

## Estrutura

| Caminho | O quê |
|---|---|
| `supabase/migrations/0001_init.sql` | Tabelas, regras de segurança (RLS) e funções |
| `src/app/q/[token]/route.ts` | Redirecionamento público do QR/NFC |
| `src/app/(app)/plaquinhas` | Lista, ativação e configuração |
| `src/app/(app)/clientes` | Carteira de clientes |
| `src/app/(app)/link-avaliacao` | Gerador de link de avaliação Google |
| `src/app/(app)/admin/lotes` | Geração de lotes, impressão e CSV |
| `src/app/(app)/loja` · `pedidos` | Loja, checkout e pedidos do revendedor |
| `src/app/(app)/fornecedor` | Painel do fornecedor |
| `src/app/(app)/admin/produtos` · `usuarios` | Catálogo e papéis |
| `src/app/api/webhooks/mercadopago` | Confirmação automática do Pix |
| `src/proxy.ts` | Renova a sessão e protege as páginas |

## Loja, pagamento e fornecedor

Rode também `supabase/migrations/0002_loja.sql` no SQL Editor e preencha no `.env.local`:

| Variável | Para quê |
|---|---|
| `SUPABASE_SECRET_KEY` | Criar pedidos e confirmar pagamentos (obrigatória para a loja) |
| `MERCADOPAGO_ACCESS_TOKEN` | Cobrança Pix. Sem ela, o admin confirma o pagamento manualmente |
| `MELHOR_ENVIO_TOKEN` + `SHIPPING_ORIGIN_CEP` | Cotação automática de frete. Sem ela, usa `SHIPPING_FIXED_CENTS` |
| `RESEND_API_KEY` + `EMAIL_FROM` | E-mails de pedido pago, enviado e entregue |

No Mercado Pago, cadastre o webhook `SEU_SITE/api/webhooks/mercadopago` (evento *Pagamentos*). Em localhost
o webhook não chega, mas a tela do Pix confere o pagamento sozinha a cada 5 segundos.

### Fluxo completo

1. **Admin** cadastra os produtos (Mais → Produtos) e define o fornecedor (Mais → Usuários).
2. **Revendedor** compra na Loja → informa entrega → escolhe o frete → paga o Pix.
3. Pagamento aprovado → o sistema gera as plaquinhas do pedido, **reservadas para o comprador**, e avisa o fornecedor.
4. **Fornecedor** (Pedidos): Iniciar produção → Imprimir QR / CSV para NFC → Marcar pronto → Enviado (rastreio) → Entregue.
5. **Revendedor** recebe, escaneia o QR de cada plaquinha (só a conta compradora consegue ativar) e configura o destino.

## Avaliações no Google e busca de clientes

Rode `supabase/migrations/0003_google.sql` e configure `GOOGLE_PLACES_API_KEY` (Google Cloud → APIs → **Places API (New)**).

- **Cliente → Avaliações no Google:** vincule a empresa (link do Maps, nome ou a plaquinha que já aponta para ela).
  O app guarda o "antes" e mostra nota e avaliações ganhas desde então, com gráfico.
- **Buscar clientes (/prospeccao):** empresas por tipo + cidade (ou perto de mim), ordenadas por oportunidade
  (nota baixa / poucas avaliações). "Salvar lead" cria o cliente na aba **Leads**.
- **Atualização automática:** `/api/cron/google` (agendada no `vercel.json`, protegida por `CRON_SECRET`).

**Custo (Places API, out/2026):** 1.000 consultas grátis/mês por tipo. Detalhes com nota: US$ 20/1.000 depois disso;
busca: US$ 35/1.000. Limites no app: `PLACES_DAILY_SEARCHES` por usuário/dia, buscas repetidas em 24h não contam,
e cada cliente é atualizado a cada `GOOGLE_REFRESH_DAYS` dias. Recomendado: defina também cotas diárias e um alerta de orçamento no Google Cloud.

## Próximos passos sugeridos

Curso/trilha, modo equipe (vendedores e comissões), plano PRO, cartão de crédito, etiqueta de frete
gerada pelo Melhor Envio, nota fiscal e cancelamento automático de pedidos não pagos.
