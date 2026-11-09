/** Busca de municípios (sem acento, sem diferenciar maiúsculas). */

export type City = { name: string; uf: string; label: string; key: string };

/** "São José do Rio Preto" → "sao jose do rio preto" */
export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCities(raw: string): City[] {
  return raw.split('\n').map((line) => {
    const [name, uf] = line.split('|');
    const label = `${name} - ${uf}`;
    return { name, uf, label, key: normalize(`${name} ${uf}`) };
  });
}

/**
 * Melhores resultados primeiro:
 * 1) nome começa com o texto; 2) alguma palavra começa com o texto; 3) contém o texto.
 * Aceita "prudente sp", "sp presidente" e "Presidente Prudente - SP".
 */
export function searchCities(cities: City[], query: string, limit = 6): City[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const terms = q.split(' ');
  const scored: { city: City; score: number }[] = [];
  for (const city of cities) {
    if (!terms.every((t) => city.key.includes(t))) continue;
    const name = normalize(city.name);
    const score = name.startsWith(q) ? 0 : (' ' + city.key).includes(' ' + terms[0]) ? 1 : 2;
    scored.push({ city, score });
  }
  scored.sort((a, b) => a.score - b.score || a.city.name.length - b.city.name.length || a.city.name.localeCompare(b.city.name));
  return scored.slice(0, limit).map((s) => s.city);
}
