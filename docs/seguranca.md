# Segurança do Rodata

Revisão de 10/11/2026. Cobre banco (Supabase/Postgres), Storage, app (celular e web) e dependências.

## Modelo de acesso

```
usuário logado (JWT do Supabase Auth)
  -> PostgREST / RPC com a chave pública (publishable)  => só o que as regras (RLS) deixam
  -> is_member(org_id)                                   => true só para membros da organização
  -> trips / notes / organization_settings               => membro lê e escreve tudo da organização
  -> organization_members                                => entra só por create_organization / accept_invite
  -> storage.objects (bucket avatars)                    => grava/apaga só em avatars/<seu id>/...
```

A chave pública vai no app e pode ser vista por qualquer um — isso é esperado. Quem protege os dados
são as regras de linha (RLS) no banco. A chave **secret / service_role nunca** vai no app nem no repositório.

## O que foi revisado e corrigido

| # | Risco | Situação | Correção |
|---|---|---|---|
| 1 | Membro lançava viagem/anotação em nome de outro (`created_by`/`author_id` livres) | Corrigido | Gatilho `force_author`: autoria é sempre o usuário logado e não muda; viagem não muda de organização |
| 2 | Adivinhar código de convite por força bruta (tentativas ilimitadas) | Corrigido | Máx. 10 códigos errados por hora por usuário (`invite_attempts`); códigos de 6 caracteres (≈ 1 bilhão de combinações), uso único, 7 dias |
| 3 | Dono saía pela API e a organização ficava sem dono | Corrigido | Regra de exclusão impede o dono de sair |
| 4 | Ao "cancelar" convite dava para trocar organização/código | Corrigido | Regra + gatilho: cancelar só muda o status |
| 5 | `avatar_url` aceitava qualquer URL (imagem externa rastreia o IP de quem abre a lista de membros) | Corrigido | Só URLs do bucket `avatars` na pasta da própria pessoa |
| 6 | Textos e valores sem limite (encher o banco, erros absurdos) | Corrigido | Limites de tamanho em nomes/textos e teto de valores e km |
| 7 | Cache offline ficava no aparelho depois de "Sair" | Corrigido | Sair apaga o cache persistido e a organização ativa |
| 8 | Senha mínima de 6 caracteres | Corrigido | Mínimo de 8 (app + `supabase/config.toml`) |
| 9 | Foto antiga ficava órfã no Storage | Corrigido | Regra de leitura da própria pasta (necessária para apagar) |
| 10 | Web sem cabeçalhos de segurança | Corrigido | `public/_headers`: CSP restrita (só o próprio site e o Supabase), anti-clickjacking, HSTS. Testado com o build real |

Todos os itens do banco têm teste em `supabase/tests/` (`npm run test:db`).

## Já estava correto

- RLS ligado em todas as tabelas; funções `security definer` com `search_path` vazio.
- Funções de análise (`dashboard_summary`, `timeline`) usam `security invoker`: respeitam o RLS.
- Anônimo não executa nenhuma função (revogado).
- Nenhum segredo no repositório (`.env.local` no `.gitignore`).
- Fotos com nome aleatório por envio (URL não adivinhável), até 1 MB, só imagem.

## Pendências (configuração de produção e próximos passos)

- **Confirmação de e-mail**: ligar em produção (Supabase → Authentication → Providers → Email → *Confirm email*).
  Localmente está desligada para facilitar o desenvolvimento.
- **Senhas vazadas**: o Supabase bloqueia senhas conhecidas em vazamentos (*Leaked password protection*), mas só no plano Pro.
- **Sessão no celular**: o token fica no AsyncStorage (não criptografado). Para aparelhos com root/jailbreak,
  trocar por armazenamento criptografado (expo-secure-store + chave AES, padrão recomendado pelo Supabase).
- **Exclusão de conta** (LGPD e regra das lojas): precisa de Edge Function com a chave de serviço.
- **Backup** do banco: o plano gratuito não tem restauração; agendar `pg_dump` (ex.: GitHub Actions).
- **Dependências**: `npm audit` aponta 5 moderadas em `glob`/`minimatch`, usadas só pelas ferramentas de
  desenvolvimento do Expo (não vão no app). Somem quando o Expo atualizar essas dependências.
- Se usar domínio próprio para o Supabase, incluir em `connect-src`/`img-src` do `public/_headers`.
