-- Cidade base de cada pessoa (como o endereço salvo de um app de delivery):
-- preenche "De onde saiu?" automaticamente ao lançar uma viagem nova.
alter table public.profiles
  add column home_city text not null default '' check (length(home_city) <= 120);
