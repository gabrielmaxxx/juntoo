// Mapeia código UF para sigla do estado
const UF_MAP: { [key: number]: string } = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF"
};

// In-memory cache — loaded once, reused everywhere
let cachedCities: { [key: string]: string[] } | null = null;
let loadingPromise: Promise<{ [key: string]: string[] }> | null = null;

/**
 * Lazy-loads the municipios JSON on first call, then caches in memory.
 */
export const loadCities = async (): Promise<{ [key: string]: string[] }> => {
  if (cachedCities) return cachedCities;
  if (loadingPromise) return loadingPromise;

  loadingPromise = import('./municipios-completo.json').then((module) => {
    const municipiosData = module.default as Array<{ codigo_uf: number; nome: string }>;
    const statesAndCities: { [key: string]: string[] } = {};

    municipiosData.forEach((municipio) => {
      const uf = UF_MAP[municipio.codigo_uf];
      if (uf) {
        if (!statesAndCities[uf]) {
          statesAndCities[uf] = [];
        }
        statesAndCities[uf].push(municipio.nome);
      }
    });

    Object.keys(statesAndCities).forEach(uf => {
      statesAndCities[uf].sort();
    });

    cachedCities = statesAndCities;
    loadingPromise = null;
    return statesAndCities;
  });

  return loadingPromise;
};

/**
 * Returns cached cities synchronously (empty object if not yet loaded).
 * Call loadCities() first to ensure data is available.
 */
export const getCitiesSync = (): { [key: string]: string[] } => {
  return cachedCities || {};
};

export const BRAZIL_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];
