import { useState, useEffect } from 'react';
import { loadCities, getCitiesSync } from '@/data/brazilStatesAndCities';

/**
 * Hook that lazy-loads city data on mount and returns it reactively.
 */
export const useCities = () => {
  const [cities, setCities] = useState<{ [key: string]: string[] }>(getCitiesSync);

  useEffect(() => {
    // If already cached, getCitiesSync() will have data
    const cached = getCitiesSync();
    if (Object.keys(cached).length > 0) {
      setCities(cached);
      return;
    }
    loadCities().then(setCities);
  }, []);

  return cities;
};
