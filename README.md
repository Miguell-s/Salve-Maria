# Salve Maria — loja virtual de terços católicos

Next.js 15 · React 19 · TypeScript · Tailwind · Framer Motion · Three.js (React Three Fiber) · PostgreSQL (Prisma)

> **Status honesto:** o código foi escrito por completo, mas **ainda não foi compilado nem rodado de ponta a ponta**
> (o ambiente de criação não tinha acesso ao npm). O que foi verificado e o que falta verificar estão em
> [Relatório de status](#relatório-de-status). Rode `npm run typecheck` e `npm run build` primeiro; se aparecer
> algum erro, ele será pequeno e localizado — me envie a mensagem.

## 1. Instalar e rodar

Pré-requisitos: Node 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # preencha DATABASE_URL, SESSION_SECRET, CRON_SECRET (veja abaixo)
npm run db:push               # cria as tabelas
npm run db:seed               # dados de DEMONSTRAÇÃO (marcados "Demonstração" no site)
ADMIN_EMAIL=voce@email.com ADMIN_NAME="Seu Nome" npm run admin:create   # cria o admin + QR do 2FA
npm run dev                   # http://localhost:3000   · painel: /admin/login
```

- `SESSION_SECRET` / `CRON_SECRET`: gere com `openssl rand -base64 48`.
- `admin:create` mostra a senha **uma única vez** e um QR code para o Google Authenticator/Authy. Sem o 2FA não há acesso ao painel.
- Quando cadastrar os itens reais: `npm run db:clear-demo` apaga tudo que é demonstração.
- Testes da lógica de cálculo/estoque/contraste: `npm test`.

## 2. Como o dono administra (sem mexer em código)

`/admin` → Dashboard · Pedidos · Terços prontos · Categorias · Cupons · **Bolinhas, Entremeios, Crucifixos, Medalhas, Pingentes, Acabamentos, Embalagens** · **Composições** (ex.: 53 + 6 bolinhas, 5 entremeios, 1 crucifixo, 1 medalha, custo de montagem) · Banners · Depoimentos · Aparência e textos · Configurações · Registros.

- Fotos: envie quantas quiser (JPG/PNG/WebP). São revalidadas e recodificadas no servidor.
- Modelo 3D opcional por peça: coloque um `.glb` em `public/models/` e informe `/models/arquivo.glb` no cadastro. Sem modelo, o 3D usa formas padrão com a cor/brilho do material.
- **Banner**: sem foto enviada aparece uma ilustração de espaço reservado. Envie uma fotografia real em *Aparência e textos*.

## 3. Integrações (credenciais no `.env`)

| Serviço | O que fazer |
|---|---|
| **Mercado Pago** | Crie a aplicação em mercadopago.com.br/developers → `MP_ACCESS_TOKEN`. Em *Webhooks*, cadastre `https://SEUSITE/api/webhooks/mercadopago` (evento *Pagamentos*) e copie a chave secreta para `MP_WEBHOOK_SECRET`. Sem o segredo, **todo webhook é recusado**. Teste primeiro com credenciais de teste. |
| **E-mail** | SMTP (`SMTP_*`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`). Qualquer provedor (Brevo, SES, Resend SMTP...). |
| **WhatsApp** | WhatsApp Business **Cloud API** (Meta): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP`. Mensagens iniciadas pela loja fora da janela de 24 h exigem *templates aprovados* pela Meta (ver `src/lib/notify.ts`). O botão flutuante de atendimento usa `wa.me` e só precisa do número em *Configurações*. |
| **Frete** | Hoje: tabela por região do CEP + frete grátis acima de X (editável no painel). Cotação em tempo real dos Correios/Melhor Envio: **pendente** (ponto de troca único em `src/lib/shipping.ts`). |
| **Manutenção** | Agende a cada 5–10 min: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://SEUSITE/api/cron/maintenance` (libera reservas vencidas, carrinho abandonado, relatório diário às 8 h). |
| **Backup** | `npm run backup` (pg_dump comprimido, mantém 14) diariamente no cron do servidor **e copie para fora do servidor**. `scripts/restore-test.sh` restaura o último backup num banco temporário para provar que funciona — rode mensalmente. |

Notificações sem credencial ficam como `SKIPPED` em *Admin › Registros* (nada é simulado como enviado).

## 4. Publicar

1. Hospedagem com Node + Postgres gerenciado (VPS, Railway, Render, Fly…). **Uploads** ficam em `public/uploads` (disco); em plataformas serverless/multi-instância troque `src/lib/uploads.ts` por S3/R2/Cloudflare Images.
2. `APP_URL` com o domínio `https://…`. Cookies de sessão só funcionam seguros em HTTPS.
3. `npm run build && npm start` (atrás de proxy reverso com TLS) e `npm run db:deploy` se usar migrações.
4. **Cloudflare** na frente (DNS proxied, WAF gerenciado, rate limiting, "Always HTTPS", Bot Fight). Com Cloudflare o IP real vem de `cf-connecting-ip` (já tratado).
5. Rate limit interno é em memória (1 instância). Com várias instâncias, troque `rateLimit` em `src/lib/security.ts` por Redis/Upstash.
6. Revise e complete `/privacidade` com advogado(a) (texto-modelo) e preencha o encarregado (DPO).

## 5. Como o estoque e o preço são protegidos

- O navegador só envia **IDs e quantidades**. Preço, frete, cupom, estoque e totais são recalculados no servidor (`/api/quote`, `/api/cart/price`, `/api/checkout`).
- Ao finalizar, uma transação **reserva** o estoque com `UPDATE … WHERE stock - reserved >= qtd` (atômico). Testado com 30 conexões simultâneas disputando 10 unidades: exatamente 10 aceitas.
- Pagamento aprovado (webhook assinado + consulta à API do Mercado Pago + conferência de valor) converte a reserva em baixa de estoque, de forma idempotente. Reservas não pagas expiram e o estoque volta. Cancelar um pedido pago devolve o estoque.
- Pagamento que chega depois da reserva expirar, valor divergente ou falta de estoque após o pagamento marcam o pedido como **“precisa de atenção”** e avisam o dono — nunca vendem acima do estoque silenciosamente.
- Toda movimentação fica em `StockMovement`; ações administrativas e logins em `AuditLog`.

## 6. Segurança implementada

Hash bcrypt (custo 12) · login com bloqueio progressivo + rate limit por IP/e-mail · **2FA (TOTP) obrigatório para admin** · sessão JWT em cookie `HttpOnly; Secure; SameSite=Lax` (`__Host-`) · verificação de `Origin` em toda requisição que altera estado (CSRF) · validação Zod em todas as entradas · Prisma parametrizado (SQL raw só com valores posicionais e tabelas de lista fixa) · `Content-Security-Policy` com nonce + `strict-dynamic`, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` · pedidos acessados por token secreto de 192 bits (sem IDOR) · uploads validados por bytes (não por extensão), recodificados com `sharp`, SVG recusado · webhooks com HMAC e comparação em tempo constante · nenhum dado de cartão toca o servidor · segredos só em variáveis de ambiente · consentimento LGPD no cadastro/checkout/newsletter.

Nenhum sistema é invulnerável. Antes de divulgar: rode `npm audit`, faça um teste de invasão básico (OWASP ZAP) no ambiente de homologação e revise permissões do banco (usuário da aplicação sem `SUPERUSER`).

## 7. Relatório de status

**Verificado aqui (executado de verdade):**
- 10 testes automatizados passando (`npm test`): cálculo `53 × R$ 0,80 = R$ 42,40`, total, estoque insuficiente (59 bolinhas necessárias, 30 disponíveis), reservas, composição configurável, ordenação anti-deadlock e contraste de cores.
- Reserva/baixa atômica de estoque testada em PostgreSQL real com concorrência.
- Sintaxe de todos os 90 arquivos TypeScript/TSX.
- A validação de contraste encontrou um problema real: o roxo oficial `#9270E8` não atinge 4,5:1 com texto. Foi mantido em títulos grandes e decoração; botões e rótulos roxos usam o tom mais profundo `#6B4BD0` (mesmo matiz). O amarelo do título recebeu contorno para leitura no fundo claro.

**Escrito mas NÃO executado ainda (falta `npm install` + build):** compilação/tipos, Prisma contra o banco, telas no navegador, visualizador 3D, fluxo completo de checkout, painel, responsividade e desempenho (Lighthouse).

**Pendente / depende de você:** credenciais (Mercado Pago, SMTP, WhatsApp), cotação de frete dos Correios, templates do WhatsApp aprovados pela Meta, fotografias reais (banner, produtos, materiais) e modelos `.glb` (opcionais), texto jurídico revisado, domínio + Cloudflare, teste de restauração de backup no seu servidor.
