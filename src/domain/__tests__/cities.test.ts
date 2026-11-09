import { describe, expect, it } from 'vitest';

import { CITIES_RAW } from '../../data/cities';
import { normalize, parseCities, searchCities } from '../cities';

const cities = parseCities(CITIES_RAW);
const labels = (q: string) => searchCities(cities, q).map((c) => c.label);

describe('cidades', () => {
  it('lista completa do IBGE', () => {
    expect(cities.length).toBeGreaterThan(5500);
    expect(cities.find((c) => c.label === 'Presidente Prudente - SP')).toBeTruthy();
  });

  it('ignora acentos e maiúsculas', () => {
    expect(normalize('São José do Rio Preto - SP')).toBe('sao jose do rio preto sp');
    expect(labels('sao jose do rio pr')[0]).toBe('São José do Rio Preto - SP');
  });

  it('começo do nome vem primeiro', () => {
    expect(labels('bauru')[0]).toBe('Bauru - SP');
    expect(labels('presidente pru')).toEqual(['Presidente Prudente - SP']);
  });

  it('aceita palavras soltas e a UF', () => {
    expect(labels('prudente sp')).toContain('Presidente Prudente - SP');
    expect(labels('campinas sp')[0]).toBe('Campinas - SP');
  });

  it('precisa de pelo menos 2 letras e limita resultados', () => {
    expect(labels('a')).toEqual([]);
    expect(labels('sa').length).toBe(6);
  });
});
