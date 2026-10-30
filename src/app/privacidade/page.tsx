import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

// MODELO inicial. Revise com um(a) advogado(a) e preencha razão social, CNPJ e canal do encarregado (DPO).
export default function Privacidade() {
  return (
    <article className="container-x max-w-3xl space-y-4 py-12 [&_h2]:mt-6 [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-4xl">Política de Privacidade</h1>
      <p className="rounded-2xl bg-yellow/30 p-3 text-sm font-bold">Texto-modelo: revise com um(a) profissional jurídico(a) antes de publicar e complete os dados da empresa.</p>
      <h2>1. Quais dados coletamos</h2>
      <p>Nome, e-mail, telefone, endereço de entrega e dados do pedido, informados por você ao comprar ou criar conta. Dados de cartão são tratados exclusivamente pelo Mercado Pago; a loja nunca os recebe nem os armazena.</p>
      <h2>2. Para que usamos</h2>
      <ul><li>Processar, entregar e dar suporte aos pedidos (execução de contrato).</li><li>Enviar avisos do pedido por e-mail e WhatsApp.</li><li>Enviar novidades, somente com o seu consentimento.</li><li>Cumprir obrigações legais e fiscais.</li></ul>
      <h2>3. Com quem compartilhamos</h2>
      <p>Mercado Pago (pagamento), transportadoras/Correios (entrega) e provedores de e-mail/WhatsApp, apenas no necessário.</p>
      <h2>4. Seus direitos (LGPD, art. 18)</h2>
      <p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação e revogação de consentimento pelo canal de contato do site.</p>
      <h2>5. Armazenamento e segurança</h2>
      <p>Senhas são guardadas com hash; a comunicação usa HTTPS; o acesso administrativo exige autenticação em duas etapas. Nenhum sistema é 100% invulnerável, mas adotamos medidas técnicas e administrativas para proteger seus dados.</p>
      <h2>6. Contato do encarregado (DPO)</h2>
      <p>[preencher: nome e e-mail]</p>
    </article>
  );
}
