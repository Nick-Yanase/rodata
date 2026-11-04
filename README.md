# Rodata

Aplicativo **mobile e web** para fretistas autônomos e seus analistas. O fretista lança cada
viagem (frete e gastos) e o Rodata mostra receita total, receita faturada, custos, evolução no
tempo, previsão dos próximos meses e quanto falta para o **limite do MEI**.

- Requisitos, arquitetura e decisões: [`docs/requisitos-e-arquitetura.md`](docs/requisitos-e-arquitetura.md)
- Um único código (Expo / React Native) para Android, iOS e Web
- Back-end Supabase (Postgres + Auth), hospedagem gratuita

## O que já funciona (MVP)

| Área | Funcionalidades |
|---|---|
| Conta | Cadastro como **fretista** ou **analista**, login, recuperar senha, sessão salva no aparelho |
| Viagens | Criar, editar, excluir (com **Desfazer**), **repetir viagem**, busca, ordenação, campos de R$ com máscara, data com atalhos Hoje/Ontem |
| Offline | Lançar viagens e anotações **sem internet**: ficam salvas no celular e são enviadas sozinhas quando o sinal volta |
| Dashboard | Período analisado × comparado, **receita total** (soma dos fretes), **receita faturada** (frete − custos), margem, custos por categoria, linha do tempo (dia/semana/mês), resumo em linguagem simples |
| MEI | Termômetro do limite (MEI caminhoneiro R$ 251.600, MEI comum R$ 81.000, ME, ou limite próprio), limite proporcional no ano de abertura, alertas de 70/90/100/120%, média mensal permitida até dezembro |
| Previsão | Próximos 3 meses e fechamento do ano em faixa (pessimista/provável/otimista); avisa o mês em que o limite seria ultrapassado |
| Analista | Convite por **código de 6 letras enviado pelo WhatsApp**; analista vê os dados (somente leitura), escreve anotações, acompanha vários fretistas; fretista pode remover o acesso |
| Anotações | Criar, editar, excluir, buscar; analista e fretista escrevem as suas |

## Rodando localmente

Pré-requisitos: Node 22+, Docker (para o Supabase local).

```bash
npm install
```

```bash
npm run db:start
```

O comando acima sobe o Supabase local, aplica `supabase/migrations` e carrega `supabase/seed.sql`
(dados de demonstração). Copie a `ANON_KEY` que ele imprime para o `.env.local`:

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY impressa pelo db:start>
```

```bash
npm run web
```

Contas de demonstração (senha `rodata123`): `fretista@rodata.dev` e `analista@rodata.dev`.

Para testar no celular, instale o app **Expo Go** e rode `npm start` (ou gere um build de
desenvolvimento com `npx eas-cli build --profile development`).

## Testes

```bash
npm run check
```

```bash
npm run test:db
```

- `npm run check` — typecheck, lint e testes das regras de negócio (`src/domain`: dinheiro, datas,
  métricas, MEI e previsão).
- `npm run test:db` — sobe um Postgres temporário e testa as políticas de acesso (RLS), o convite
  do analista e as funções de análise (`supabase/tests`).

## Deploy gratuito

1. **Supabase**: crie um projeto em supabase.com (plano Free). Depois:
   ```bash
   npx supabase link --project-ref <ref-do-projeto>
   ```
   ```bash
   npx supabase db push
   ```
   Em *Authentication → URL Configuration*, coloque a URL do site em **Site URL** e adicione
   `https://<seu-site>/**` e `rodata://**` em **Redirect URLs**.
2. **Web (Cloudflare Pages)**: crie um projeto Pages chamado `rodata` e cadastre no GitHub
   (*Settings → Secrets → Actions*): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. O workflow `deploy-web.yml` publica a cada push na `main`.
3. **Android**: `npx eas-cli build -p android --profile preview` gera um APK que pode ser enviado
   por link/WhatsApp (sem custo de loja).
4. **Manter o Supabase acordado**: o workflow `keep-alive.yml` faz uma consulta diária (o plano
   gratuito pausa projetos sem uso por ~7 dias).

## Estrutura

```
src/
  app/            rotas (Expo Router): (auth) login/cadastro, (app) abas e formulários
  components/     UI acessível (botões grandes, campo de R$, cards do dashboard, gráfico)
  domain/         regras de negócio puras e testadas (MEI, previsão, métricas, datas, dinheiro)
  features/       acesso a dados por área (auth, trips, notes, dashboard, settings)
  lib/            cliente Supabase, cache/offline (TanStack Query), utilitários
  theme/          tokens de cor/tipografia do Figma (ajustados para contraste AA)
supabase/
  migrations/     tabelas, RLS, convites e funções de análise
  tests/          testes SQL (RLS e análises)
  seed.sql        dados de demonstração (somente local)
```
