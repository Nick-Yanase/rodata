#!/usr/bin/env node
// Gera src/data/cities.ts com os municípios do Brasil a partir da API do IBGE.
// A lista vai embutida no app (≈ 100 KB): a busca funciona sem internet e não
// baixa 2 MB do IBGE a cada uso. Rode de novo se o IBGE criar/renomear municípios:
//   node scripts/update-cities.mjs
import { writeFileSync } from 'node:fs';

const IBGE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';
const res = await fetch(IBGE_URL);
if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
const list = await res.json();
const lines = list
  .map((m) => `${m['municipio-nome']}|${m['UF-sigla']}`)
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));

const out = `// Gerado por scripts/update-cities.mjs em ${new Date().toISOString().slice(0, 10)} — não editar à mão.
// Fonte: IBGE, API de localidades. ${lines.length} municípios no formato "Nome|UF".
export const CITIES_RAW = ${JSON.stringify(lines.join('\n'))};
`;
writeFileSync(new URL('../src/data/cities.ts', import.meta.url), out);
console.log(`${lines.length} municípios gravados em src/data/cities.ts`);
